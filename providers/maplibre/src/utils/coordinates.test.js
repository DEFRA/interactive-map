import proj4 from 'proj4'
import { createCoordinateConverter } from './coordinates.js'

const BNG = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'
const bngConverter = proj4(BNG)
const projection = { forward: bngConverter.forward, inverse: bngConverter.inverse }

const expectPositionClose = (actual, expected, digits) => {
  expect(actual[0]).toBeCloseTo(expected[0], digits)
  expect(actual[1]).toBeCloseTo(expected[1], digits)
}

describe('createCoordinateConverter', () => {
  describe('without a projection (EPSG:4326)', () => {
    const converter = createCoordinateConverter(null)

    it('returns coordinates, GeoJSON and bounds unchanged', () => {
      const geojson = { type: 'Point', coordinates: [-2.46, 54.56] }
      expect(converter.toLngLat([-2.46, 54.56])).toEqual([-2.46, 54.56])
      expect(converter.fromLngLat([-2.46, 54.56])).toEqual([-2.46, 54.56])
      expect(converter.geojsonToLngLat(geojson)).toBe(geojson)
      expect(converter.bboxToLngLat([-3, 54, -2, 55])).toEqual([-3, 54, -2, 55])
    })
  })

  describe('with the British National Grid projection', () => {
    const converter = createCoordinateConverter(projection)

    it('returns eastings and northings to within a millimetre of where they started', () => {
      const eastingNorthing = [370353.84, 518965.09]
      const roundTrip = converter.fromLngLat(converter.toLngLat(eastingNorthing))
      expect(Math.hypot(roundTrip[0] - eastingNorthing[0], roundTrip[1] - eastingNorthing[1])).toBeLessThan(0.001)
    })

    it('converts every position in a FeatureCollection, keeping other members', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', id: 1, properties: { name: 'point' }, geometry: { type: 'Point', coordinates: [370619, 518593, 12] } },
          { type: 'Feature', id: 2, properties: {}, geometry: { type: 'Polygon', coordinates: [[[370000, 518000], [371000, 518000], [371000, 519000], [370000, 518000]]] } }
        ]
      }
      const lngLat = converter.geojsonToLngLat(geojson)
      const [point, polygon] = lngLat.features

      expect(point.id).toBe(1)
      expect(point.properties).toEqual({ name: 'point' })
      expectPositionClose(point.geometry.coordinates, converter.toLngLat([370619, 518593]), 9)
      expect(point.geometry.coordinates[2]).toBe(12)
      expect(polygon.geometry.coordinates[0]).toHaveLength(4)
      expectPositionClose(polygon.geometry.coordinates[0][1], converter.toLngLat([371000, 518000]), 9)
      expect(geojson.features[0].geometry.coordinates).toEqual([370619, 518593, 12])
    })

    it('converts geometry collections and features without geometry', () => {
      const collection = { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [370619, 518593] }] }
      expectPositionClose(converter.geojsonToLngLat(collection).geometries[0].coordinates, converter.toLngLat([370619, 518593]), 9)
      expect(converter.geojsonToLngLat({ type: 'Feature', properties: {}, geometry: null }).geometry).toBeNull()
    })

    it('converts bounds to the box enclosing all four converted corners', () => {
      const bbox = [370945, 518391, 374023, 525049]
      const corners = [[370945, 518391], [370945, 525049], [374023, 518391], [374023, 525049]].map(converter.toLngLat)
      expect(converter.bboxToLngLat(bbox)).toEqual([
        Math.min(...corners.map(([lng]) => lng)),
        Math.min(...corners.map(([, lat]) => lat)),
        Math.max(...corners.map(([lng]) => lng)),
        Math.max(...corners.map(([, lat]) => lat))
      ])
    })
  })
})
