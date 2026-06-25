import { getExtentFromFlatCoords, getPointFromFlatCoords, getBboxFromGeoJSON } from './coords.js'

jest.mock('@arcgis/core/geometry/Extent.js', () =>
  jest.fn().mockImplementation((opts) => ({ ...opts, type: 'extent' }))
)
jest.mock('@arcgis/core/geometry/Point.js', () =>
  jest.fn().mockImplementation((opts) => ({ ...opts, type: 'point' }))
)

describe('coords utils', () => {
  describe('getExtentFromFlatCoords', () => {
    test('returns an Extent with correct xmin/ymin/xmax/ymax', () => {
      const result = getExtentFromFlatCoords([1, 2, 3, 4])
      expect(result.xmin).toBe(1)
      expect(result.ymin).toBe(2)
      expect(result.xmax).toBe(3)
      expect(result.ymax).toBe(4)
      expect(result.spatialReference).toEqual({ wkid: 27700 })
    })

    test('returns undefined for falsy input', () => {
      expect(getExtentFromFlatCoords(null)).toBeUndefined()
      expect(getExtentFromFlatCoords(undefined)).toBeUndefined()
    })
  })

  describe('getPointFromFlatCoords', () => {
    test('returns a Point with correct x/y', () => {
      const result = getPointFromFlatCoords([100, 200])
      expect(result.x).toBe(100)
      expect(result.y).toBe(200)
      expect(result.spatialReference).toEqual({ wkid: 27700 })
    })

    test('returns undefined for falsy input', () => {
      expect(getPointFromFlatCoords(null)).toBeUndefined()
    })
  })

  describe('getBboxFromGeoJSON', () => {
    test('Point feature → extent wrapping that single point', () => {
      const feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [300000, 100000] },
        properties: {}
      }
      const result = getBboxFromGeoJSON(feature)
      expect(result.xmin).toBe(300000)
      expect(result.ymin).toBe(100000)
      expect(result.xmax).toBe(300000)
      expect(result.ymax).toBe(100000)
    })

    test('LineString feature → tight bbox around all coords', () => {
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[100, 200], [300, 50], [500, 400]]
        },
        properties: {}
      }
      const result = getBboxFromGeoJSON(feature)
      expect(result.xmin).toBe(100)
      expect(result.ymin).toBe(50)
      expect(result.xmax).toBe(500)
      expect(result.ymax).toBe(400)
    })

    test('Polygon feature → bbox around all rings', () => {
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]]
        },
        properties: {}
      }
      const result = getBboxFromGeoJSON(feature)
      expect(result.xmin).toBe(0)
      expect(result.ymin).toBe(0)
      expect(result.xmax).toBe(10)
      expect(result.ymax).toBe(5)
    })

    test('FeatureCollection → bbox spanning all features', () => {
      const fc = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [100, 200] }, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [500, 800] }, properties: {} }
        ]
      }
      const result = getBboxFromGeoJSON(fc)
      expect(result.xmin).toBe(100)
      expect(result.ymin).toBe(200)
      expect(result.xmax).toBe(500)
      expect(result.ymax).toBe(800)
    })

    test('GeometryCollection → bbox spanning all geometries', () => {
      const gc = {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [10, 20] },
          { type: 'LineString', coordinates: [[50, 5], [100, 90]] }
        ]
      }
      const result = getBboxFromGeoJSON(gc)
      expect(result.xmin).toBe(10)
      expect(result.ymin).toBe(5)
      expect(result.xmax).toBe(100)
      expect(result.ymax).toBe(90)
    })

    test('result has correct spatialReference from getExtentFromFlatCoords', () => {
      const feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: {}
      }
      const result = getBboxFromGeoJSON(feature)
      expect(result.spatialReference).toEqual({ wkid: 27700 })
    })
  })
})
