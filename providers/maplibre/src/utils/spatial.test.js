// tests/utils/spatial.test.js
import * as spatial from '../../src/utils/spatial.js'

jest.mock('geodesy/latlon-spherical.js', () =>
  jest.fn().mockImplementation((lat, lng) => ({
    distanceTo: jest.fn((other) => Math.abs(lat - (other.lat || 0)) * 1609 + Math.abs(lng - (other.lon || 0)) * 1609)
  }))
)

jest.mock('@turf/bbox', () => jest.fn(() => [-1, 50, 1, 52]))

describe('spatial utils', () => {

  test('formatDimension hits all branches', () => {
    // < 0.5 miles
    expect(spatial.formatDimension(500)).toMatch(/m$/)

    // Singular mile (exactly 1.0) - hits value === 1 branch
    expect(spatial.formatDimension(1609.344)).toBe('1 mile')

    // 5 miles
    const metersSmallMiles = 5 * 1609.344
    expect(spatial.formatDimension(metersSmallMiles)).toMatch(/^5\s*miles$/)

    // >= WHOLE_MILE_THRESHOLD
    const metersLarge = 15 * 1609.344
    expect(spatial.formatDimension(metersLarge)).toBe('15 miles')
  })

  test('array bounds triggers all branches', () => {
    const dims = spatial.getAreaDimensions([[0, 0], [0.01, 0.02]])
    expect(dims).toMatch(/by/)
  })

  test('LngLatBounds object triggers getWest/getSouth branch', () => {
    const fakeBounds = { getWest: () => 0, getSouth: () => 0, getEast: () => 0.01, getNorth: () => 0.02 }
    expect(spatial.getAreaDimensions(fakeBounds)).toMatch(/by/)
  })

  test('invalid bounds returns empty string', () => {
    expect(spatial.getAreaDimensions(null)).toBe('')
    expect(spatial.getAreaDimensions([])).toBe('')
  })

  test('north/south/east/west moves', () => {
    expect(spatial.getCardinalMove([0,0],[0,0.5])).toMatch(/north/)
    expect(spatial.getCardinalMove([0,0],[0,-0.5])).toMatch(/south/)
    expect(spatial.getCardinalMove([0,0],[0.5,0])).toMatch(/east/)
    expect(spatial.getCardinalMove([0,0],[-0.5,0])).toMatch(/west/)
    expect(spatial.getCardinalMove([0,0],[0.5,0.5])).toMatch(/north.*east|east.*north/)
    expect(spatial.getCardinalMove([0,0],[0.00001,0.00001])).toBe('')
  })

  test('spatialNavigate all directions and fallback', () => {
    const pixels = [[0,0],[0,-1],[1,0],[0,1],[-1,0]]
    expect(spatial.spatialNavigate('ArrowUp',[0,0],pixels)).toBe(1)
    expect(spatial.spatialNavigate('ArrowDown',[0,0],pixels)).toBe(3)
    expect(spatial.spatialNavigate('ArrowLeft',[0,0],pixels)).toBe(4)
    expect(spatial.spatialNavigate('ArrowRight',[0,0],pixels)).toBe(2)
    expect(spatial.spatialNavigate('InvalidDir',[0,0],pixels)).toBe(0)
  })

  test('spatialNavigate finds closer candidates (hits dist < minDist)', () => {
    const start = [0,0]
    const pixels = [[0,0],[10,0],[2,0]] 
    expect(spatial.spatialNavigate('ArrowRight', start, pixels)).toBe(2)
  })

  test('spatialNavigate skips farther candidate (dist >= minDist false branch)', () => {
    // Closer candidate first → second candidate fails dist < minDist
    const pixels = [[0,0],[2,0],[10,0]]
    expect(spatial.spatialNavigate('ArrowRight', [0,0], pixels)).toBe(1)
  })

  test('spatialNavigate diagonal with dx>dy', () => {
    const start = [0,0]
    const pixels = [[0,0],[3,1],[1,0]] // dx>dy
    expect(spatial.spatialNavigate('ArrowRight', start, pixels)).toBe(2)
  })

  test('getResolution returns positive value', () => {
    expect(spatial.getResolution({lat:0},1)).toBeGreaterThan(0)
  })

  test('getPaddedBounds returns bounds', () => {
    const map = {
      getContainer: () => ({ getBoundingClientRect: () => ({ width:100,height:200 }) }),
      getPadding: () => ({ top:1,right:2,bottom:3,left:4 }),
      unproject: p => ({ x:p[0], y:p[1] })
    }
    const LngLatBounds = function(sw,ne){
      return {sw,ne}
    }
    const bounds = spatial.getPaddedBounds(LngLatBounds,map)
    expect(bounds.sw).toBeDefined()
    expect(bounds.ne).toBeDefined()
  })

  test('getBboxFromGeoJSON delegates to @turf/bbox and returns flat bbox array', () => {
    const turfBbox = require('@turf/bbox')
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 52] }, properties: {} }

    const result = spatial.getBboxFromGeoJSON(feature)

    expect(turfBbox).toHaveBeenCalledWith(feature)
    expect(result).toEqual([-1, 50, 1, 52])
  })

  describe('isGeometryObscured', () => {
    const geojson = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 51] }, properties: {} }
    // getBboxFromGeoJSON is mocked to always return [-1, 50, 1, 52]

    // Container sits at viewport origin so container-relative coords equal viewport coords
    const makeMap = (projectFn) => ({
      getContainer: jest.fn(() => ({
        getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, right: 1000, bottom: 800 }))
      })),
      project: jest.fn(projectFn)
    })

    // Panel occupies the right 400px of the viewport
    const panelRect = { left: 600, top: 0, right: 1000, bottom: 800, width: 400, height: 800 }

    test('returns true when geometry screen bbox overlaps the panel rect', () => {
      // Corners project into the panel (x: 650 is between panelLeft 600 and panelRight 1000)
      const map = makeMap(() => ({ x: 650, y: 400 }))
      expect(spatial.isGeometryObscured(geojson, panelRect, map)).toBe(true)
    })

    test('returns false when geometry screen bbox does not overlap the panel rect', () => {
      // Corners project to x: 300, entirely left of panelLeft (600)
      const map = makeMap(() => ({ x: 300, y: 400 }))
      expect(spatial.isGeometryObscured(geojson, panelRect, map)).toBe(false)
    })

    test('projects all four bbox corners', () => {
      const map = makeMap(() => ({ x: 300, y: 400 }))
      spatial.isGeometryObscured(geojson, panelRect, map)
      // bbox is [-1, 50, 1, 52]: corners are [-1,50], [-1,52], [1,50], [1,52]
      expect(map.project).toHaveBeenCalledTimes(4)
    })
  })
})