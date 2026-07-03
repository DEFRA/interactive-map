import { setup, firedWith, DrawLineMode } from './drawMode/__helpers__/harness.js'

const drawVertexMarkers = (ctx, state, geometry) => {
  const display = jest.fn()
  ctx.toDisplayFeatures(state, { type: 'Feature', properties: { id: state.line.id }, geometry }, display)
  return display.mock.calls.map(([f]) => f)
    .filter((f) => f.properties.meta === 'draw-vertex')
    .map((m) => m.geometry.coordinates)
}

describe('DrawLineMode config', () => {
  test('excludeFeatureIdFromSetup starts a fresh line feature even when a featureId is supplied', () => {
    const { state } = setup(DrawLineMode)
    expect(state.line).toBeDefined()
    expect(state.featureId).toBe('shape-1')
  })

  test('getCoords reads the line coordinates directly (not a ring)', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    expect(state.line.coordinates[0]).toEqual([5, 5]) // first placed vertex, at map centre
  })

  test('getPlacedCoords marks every placed vertex, excluding the rubber band', () => {
    const { ctx, state } = setup(DrawLineMode)
    // Display coords: [v0..vN, rubber_band] → placed = slice(0, -1)
    expect(drawVertexMarkers(ctx, state, { type: 'LineString', coordinates: [[5, 5], [8, 8]] })).toEqual([[5, 5]])
  })

  test('finishOnInvalidClick finishes the line when the same spot is clicked twice', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.doClick(state) // same spot → finish (like a double-click)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(1)
    expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', { featureIds: [state.line.id] })
  })
})
