import { toTurfGeometry } from './turfHelpers.js'
import { polygon, multiPolygon, lineString, multiLineString, point, multiPoint } from '@turf/helpers'

describe('toTurfGeometry', () => {
  const geomTypes = [
    { type: 'Polygon', coords: [[[0,0],[1,0],[1,1],[0,0]]], fn: polygon },
    { type: 'MultiPolygon', coords: [[[[0,0],[1,0],[1,1],[0,0]]]], fn: multiPolygon },
    { type: 'LineString', coords: [[0,0],[1,1]], fn: lineString },
    { type: 'MultiLineString', coords: [[[0,0],[1,1]]], fn: multiLineString },
    { type: 'Point', coords: [0,0], fn: point },
    { type: 'MultiPoint', coords: [[0,0],[1,1]], fn: multiPoint }
  ]

  geomTypes.forEach(({ type, coords, fn }) => {
    it(`converts ${type} Feature`, () => {
      const feature = { type: 'Feature', geometry: { type, coordinates: coords } }
      expect(toTurfGeometry(feature)).toEqual(fn(coords))
    })

    it(`converts raw ${type} geometry`, () => {
      const geom = { type, coordinates: coords }
      expect(toTurfGeometry(geom)).toEqual(fn(coords))
    })
  })

  it('throws on unsupported geometry', () => {
    expect(() => toTurfGeometry({ type: 'Feature', geometry: { type: 'Circle', coordinates: [] } }))
      .toThrow('Unsupported geometry type: Circle')
  })
})
