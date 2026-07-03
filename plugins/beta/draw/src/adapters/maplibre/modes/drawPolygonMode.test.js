import { setup, clickAt, DrawPolygonMode } from './drawMode/__helpers__/harness.js'

const drawVertexMarkers = (ctx, state, geometry) => {
  const display = jest.fn()
  ctx.toDisplayFeatures(state, { type: 'Feature', properties: { id: state.polygon.id }, geometry }, display)
  return display.mock.calls.map(([f]) => f)
    .filter((f) => f.properties.meta === 'draw-vertex')
    .map((m) => m.geometry.coordinates)
}

describe('DrawPolygonMode config', () => {
  test('getCoords reads the polygon ring; validateClick (isValidClick) rejects a duplicate click', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    expect(state.polygon.coordinates[0].map(([x]) => x)).toEqual([0, 10, 10]) // v0, v1, rubber band
    clickAt(ctx, state, 10, 0) // same spot → rejected by isValidClick
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('getPlacedCoords marks every placed vertex, excluding the rubber band and closing point', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    // Display ring: [v0..vN, rubber_band, v0_closing] → placed = slice(0, -2)
    const ring = [[0, 0], [10, 0], [10, 10], [5, 5], [0, 0]]
    expect(drawVertexMarkers(ctx, state, { type: 'Polygon', coordinates: [ring] })).toEqual([[0, 0], [10, 0], [10, 10]])
  })
})
