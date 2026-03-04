import { isGeometryObscured } from './spatial.js'

jest.mock('@arcgis/core/geometry/Extent.js', () =>
  jest.fn().mockImplementation((opts) => ({ ...opts, type: 'extent' }))
)

jest.mock('@arcgis/core/geometry/Point.js', () =>
  jest.fn().mockImplementation((opts) => ({ ...opts, type: 'point' }))
)

jest.mock('./coords.js', () => ({
  getBboxFromGeoJSON: jest.fn(() => ({
    xmin: 100, ymin: 200, xmax: 500, ymax: 600,
    spatialReference: { wkid: 27700 },
    type: 'extent'
  }))
}))

describe('isGeometryObscured', () => {
  const geojson = { type: 'Feature', geometry: { type: 'Point', coordinates: [300, 400] }, properties: {} }

  // Container sits at viewport origin so container-relative coords equal viewport coords
  const makeView = (toScreenFn) => ({
    container: {
      getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, right: 1000, bottom: 800 }))
    },
    toScreen: jest.fn(toScreenFn)
  })

  // Panel occupies the right 400px of the viewport
  const panelRect = { left: 600, top: 0, right: 1000, bottom: 800, width: 400, height: 800 }

  test('returns false when view has no container', () => {
    expect(isGeometryObscured(geojson, panelRect, null)).toBe(false)
    expect(isGeometryObscured(geojson, panelRect, {})).toBe(false)
  })

  test('returns true when geometry screen bbox overlaps the panel rect', () => {
    // Corners project into the panel (x: 650 is between panelLeft 600 and panelRight 1000)
    const view = makeView(() => ({ x: 650, y: 400 }))
    expect(isGeometryObscured(geojson, panelRect, view)).toBe(true)
  })

  test('returns false when geometry screen bbox does not overlap the panel rect', () => {
    // Corners project to x: 300, entirely left of panelLeft (600)
    const view = makeView(() => ({ x: 300, y: 400 }))
    expect(isGeometryObscured(geojson, panelRect, view)).toBe(false)
  })

  test('projects all four bbox corners', () => {
    const view = makeView(() => ({ x: 300, y: 400 }))
    isGeometryObscured(geojson, panelRect, view)
    expect(view.toScreen).toHaveBeenCalledTimes(4)
  })
})
