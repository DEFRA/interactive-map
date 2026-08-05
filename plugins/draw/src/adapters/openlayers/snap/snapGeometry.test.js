import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import LinearRing from 'ol/geom/LinearRing.js'
import Polygon from 'ol/geom/Polygon.js'
import MultiLineString from 'ol/geom/MultiLineString.js'
import MultiPolygon from 'ol/geom/MultiPolygon.js'
import MultiPoint from 'ol/geom/MultiPoint.js'
import { bestOf, testOLFeature, testRenderFeature } from './snapGeometry.js'

const TOL = 100 // 10px tolerance, squared

describe('bestOf candidate ranking', () => {
  const vertex = (distSq) => ({ type: 'vertex', distSq })
  const edge = (distSq) => ({ type: 'edge', distSq })

  test('a vertex always beats an edge, regardless of distance', () => {
    expect(bestOf(edge(1), vertex(99))).toEqual(vertex(99))
    expect(bestOf(vertex(99), edge(1))).toEqual(vertex(99))
  })

  test('within the same type the closer candidate wins', () => {
    expect(bestOf(vertex(50), vertex(10))).toEqual(vertex(10))
    expect(bestOf(edge(10), edge(50))).toEqual(edge(10))
  })

  test('null candidates never win', () => {
    expect(bestOf(null, vertex(50))).toEqual(vertex(50))
    expect(bestOf(vertex(50), null)).toEqual(vertex(50))
    expect(bestOf(null, null)).toBeNull()
  })
})

describe('testOLFeature', () => {
  test('points snap as vertices within tolerance only', () => {
    const feature = new Feature(new Point([100, 100]))
    expect(testOLFeature(feature, [103, 104], TOL)).toEqual({ type: 'vertex', coord: [100, 100], distSq: 25 })
    expect(testOLFeature(feature, [200, 200], TOL)).toBeNull()
  })

  test('lines snap to the nearest vertex, or to the closest point on an edge', () => {
    const feature = new Feature(new LineString([[0, 0], [100, 0]]))
    expect(testOLFeature(feature, [2, 2], TOL)).toMatchObject({ type: 'vertex', coord: [0, 0] })
    expect(testOLFeature(feature, [50, 5], TOL)).toMatchObject({ type: 'edge', coord: [50, 0] })
  })

  test('a query beyond the segment end clamps to the endpoint', () => {
    const feature = new Feature(new LineString([[0, 0], [100, 0]]))
    expect(testOLFeature(feature, [106, 0], TOL)).toMatchObject({ coord: [100, 0] })
  })

  test('polygons snap on the closing edge and skip the duplicated closing vertex', () => {
    const feature = new Feature(new Polygon([[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]))
    // Closing edge [0,100] → [0,0]
    expect(testOLFeature(feature, [5, 50], TOL)).toMatchObject({ type: 'edge', coord: [0, 50] })
    // Exactly on the first/closing vertex — one vertex candidate, not two
    expect(testOLFeature(feature, [0, 0], TOL)).toMatchObject({ type: 'vertex', coord: [0, 0], distSq: 0 })
  })

  test('multi-part geometries test every part and ring', () => {
    const multiLine = new Feature(new MultiLineString([[[0, 0], [10, 0]], [[200, 200], [300, 200]]]))
    expect(testOLFeature(multiLine, [201, 201], TOL)).toMatchObject({ type: 'vertex', coord: [200, 200] })

    const ring = new Feature(new LinearRing([[0, 0], [50, 0], [50, 50], [0, 0]]))
    expect(testOLFeature(ring, [25, 25], TOL)).toMatchObject({ type: 'edge', coord: [25, 25] })

    const multiPolygon = new Feature(new MultiPolygon([
      [[[0, 0], [10, 0], [10, 10], [0, 0]]],
      [[[200, 200], [300, 200], [300, 300], [200, 200]]]
    ]))
    expect(testOLFeature(multiPolygon, [202, 201], TOL)).toMatchObject({ type: 'vertex', coord: [200, 200] })
  })

  test('a zero-length segment degrades to its start point', () => {
    const feature = new Feature(new LineString([[10, 10], [10, 10]]))
    expect(testOLFeature(feature, [12, 10], TOL)).toMatchObject({ type: 'vertex', coord: [10, 10] })
  })

  test('unsupported or missing geometries yield no candidate', () => {
    expect(testOLFeature(new Feature(new MultiPoint([[0, 0]])), [0, 0], TOL)).toBeNull()
    expect(testOLFeature(new Feature(), [0, 0], TOL)).toBeNull()
  })
})

describe('testRenderFeature (vector-tile render features)', () => {
  const renderFeature = (type, flat, ends = null) => ({
    getType: () => type,
    getFlatCoordinates: () => flat,
    getEnds: () => ends
  })

  test('points return a single vertex candidate within tolerance', () => {
    expect(testRenderFeature(renderFeature('Point', [10, 10]), [12, 10], TOL))
      .toEqual([{ type: 'vertex', coord: [10, 10], distSq: 4 }])
    expect(testRenderFeature(renderFeature('Point', [10, 10]), [100, 100], TOL)).toEqual([])
  })

  test('lines return best vertex AND best edge, with adjacency/segment metadata', () => {
    const line = renderFeature('LineString', [0, 0, 100, 0, 100, 100])
    const [vertex, edge] = testRenderFeature(line, [98, 4], TOL)
    expect(vertex).toMatchObject({ type: 'vertex', coord: [100, 0], adjacent: [[0, 0], [100, 100]] })
    expect(edge).toMatchObject({ type: 'edge', seg: [[100, 0], [100, 100]] })
  })

  test('open line ends have null adjacency on the open side', () => {
    const line = renderFeature('LineString', [0, 0, 100, 0])
    const [vertex] = testRenderFeature(line, [1, 1], TOL)
    expect(vertex).toMatchObject({ coord: [0, 0], adjacent: [null, [100, 0]] })
  })

  test('the far end of an open line also reports a null neighbour on its open side', () => {
    const line = renderFeature('LineString', [0, 0, 100, 0])
    const [vertex] = testRenderFeature(line, [99, 1], TOL)
    expect(vertex).toMatchObject({ coord: [100, 0], adjacent: [[0, 0], null] })
  })

  test('polygon rings (no duplicated closing coord in tiles) wrap edges and adjacency', () => {
    const square = renderFeature('Polygon', [0, 0, 100, 0, 100, 100, 0, 100], [8])
    const candidates = testRenderFeature(square, [2, 52], TOL)
    expect(candidates).toEqual([expect.objectContaining({ type: 'edge', coord: [0, 52], seg: [[0, 100], [0, 0]] })])

    const [vertex] = testRenderFeature(square, [1, 1], TOL)
    expect(vertex).toMatchObject({ coord: [0, 0], adjacent: [[0, 100], [100, 0]] }) // wraps to last vertex
  })

  test('multi-line render features honour their part boundaries', () => {
    const twoParts = renderFeature('MultiLineString', [0, 0, 10, 0, 200, 200, 300, 200], [4, 8])
    // No phantom edge between [10,0] and [200,200] — a query midway finds nothing
    expect(testRenderFeature(twoParts, [105, 100], TOL)).toEqual([])
    expect(testRenderFeature(twoParts, [201, 200], TOL)[0]).toMatchObject({ coord: [200, 200] })
  })

  test('unsupported render feature types return no candidates', () => {
    expect(testRenderFeature(renderFeature('MultiPoint', [0, 0]), [0, 0], TOL)).toEqual([])
  })
})
