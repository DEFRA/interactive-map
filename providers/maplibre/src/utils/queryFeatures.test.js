import { queryFeatures } from './queryFeatures.js'

const mockMap = {
  project: (l) => ({ x: l[0], y: l[1] }),
  unproject: (p) => ({ lng: p.x, lat: p.y }),
  queryRenderedFeatures: () => []
}

describe('queryFeatures coverage', () => {
  test('all branches and sorting', () => {
    // 1. Test empty case
    expect(queryFeatures(mockMap, { x: 0, y: 0 })).toEqual([])

    // 2. Data-driven loop for all geometry types and distance edge cases
    const cases = [
      { type: 'Point', coords: [0, 0], p: { x: 3, y: 4 } },
      { type: 'LineString', coords: [[0, 0], [10, 0]], p: { x: 5, y: 5 } }, // t=0.5
      { type: 'LineString', coords: [[0, 0], [0, 0]], p: { x: 1, y: 1 } }, // l2=0
      { type: 'LineString', coords: [[0, 0], [10, 0]], p: { x: -5, y: 0 } }, // t<0
      { type: 'MultiPoint', coords: [[0, 0], [10, 10]], p: { x: 1, y: 0 } },
      { type: 'MultiLineString', coords: [[[0, 0], [10, 0]]], p: { x: 5, y: 1 } },
      { type: 'Polygon', coords: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]], p: { x: 5, y: 5 } }, // Inside
      { type: 'MultiPolygon', coords: [[[[0, 0], [10, 0], [10, 10], [0, 0]]]], p: { x: 20, y: 20 } }, // Outside
      { type: 'Unknown', coords: [], p: { x: 0, y: 0 } }
    ]

    cases.forEach(({ type, coords, p }) => {
      const feat = { id: type, layer: { id: 'L1' }, geometry: { type, coordinates: coords } }
      const map = { ...mockMap, queryRenderedFeatures: () => [feat, feat] } // Hits deduplication
      expect(queryFeatures(map, p).length).toBe(1)
    })

    // 3. Hits Line 144 (.sort) and property-based ID fallback
    const f1 = {
      properties: { key: 'a' },
      layer: { id: 'layer-A' },
      geometry: { type: 'Point', coordinates: [10, 10] }
    }
    const f2 = {
      id: 'b',
      layer: { id: 'layer-B' },
      geometry: { type: 'Point', coordinates: [0, 0] }
    }

    // map.queryRenderedFeatures returns multiple items to trigger .sort()
    const sortMap = { ...mockMap, queryRenderedFeatures: () => [f1, f2] }
    const result = queryFeatures(sortMap, { x: 0, y: 0 })

    expect(result.length).toBe(2)
    expect(result[0].layer.id).toBe('layer-A') // Sorted by layerStack index

    // 4. Hit ray-casting intersect logic (Line 42 branch)
    const polyFeat = {
      layer: { id: 'L' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 10], [0, 10], [0, 0]]] }
    }
    const rayMap = { ...mockMap, queryRenderedFeatures: () => [polyFeat] }
    expect(queryFeatures(rayMap, { x: -1, y: 5 }).length).toBe(1)
  })
})
