import { createFeatureStore } from './featureStore.js'

const geojson = (id, coords = [[[0, 0], [10, 0], [10, 10], [0, 0]]]) => ({
  type: 'Feature',
  id,
  properties: { label: 'field' },
  geometry: { type: 'Polygon', coordinates: coords }
})

test('add returns the OL feature, retrievable by id in both OL and GeoJSON form', () => {
  const store = createFeatureStore()
  const olFeature = store.add(geojson('f1'))
  expect(store.getOL('f1')).toBe(olFeature)
  expect(store.get('f1')).toMatchObject({ id: 'f1', properties: { label: 'field' } })
  expect(store.get('f1').geometry.coordinates[0]).toHaveLength(4)
})

test('adding the same id replaces the existing feature instead of duplicating', () => {
  const store = createFeatureStore()
  store.add(geojson('f1'))
  store.add(geojson('f1', [[[0, 0], [99, 0], [99, 99], [0, 0]]]))
  expect(store.source.getFeatures()).toHaveLength(1)
  expect(store.get('f1').geometry.coordinates[0][1]).toEqual([99, 0])
})

test('unknown ids come back null', () => {
  const store = createFeatureStore()
  expect(store.getOL('missing')).toBeNull()
  expect(store.get('missing')).toBeNull()
})

test('remove deletes by id and tolerates unknown ids; clear empties the source', () => {
  const store = createFeatureStore()
  store.add(geojson('f1'))
  store.add(geojson('f2'))
  store.remove('f1')
  store.remove('missing') // no throw
  expect(store.source.getFeatures()).toHaveLength(1)
  store.clear()
  expect(store.source.getFeatures()).toHaveLength(0)
})

test('remove accepts an array of ids and deletes all of them', () => {
  const store = createFeatureStore()
  store.add(geojson('f1'))
  store.add(geojson('f2'))
  store.add(geojson('f3'))
  store.remove(['f1', 'f2', 'missing'])
  expect(store.source.getFeatures()).toHaveLength(1)
  expect(store.get('f3')).not.toBeNull()
})

test('toGeoJSON / fromGeoJSON round-trip without touching the source', () => {
  const store = createFeatureStore()
  const olFeature = store.fromGeoJSON(geojson('f9'))
  expect(store.source.getFeatures()).toHaveLength(0)
  expect(store.toGeoJSON(olFeature)).toMatchObject({ id: 'f9', geometry: { type: 'Polygon' } })
})
