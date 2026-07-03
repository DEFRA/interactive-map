import { setup, clickAt, DrawPolygonMode, DrawLineMode } from './__helpers__/harness.js'

describe('vertex marker display', () => {
  const displayed = (ctx, state, geometry, id) => {
    const display = jest.fn()
    ctx.toDisplayFeatures(state, { type: 'Feature', properties: { id }, geometry }, display)
    return display.mock.calls.map(([f]) => f).filter((f) => f.properties.meta === 'draw-vertex')
  }

  test('every placed polygon vertex gets a display-only draw-vertex marker', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    const ring = [[0, 0], [10, 0], [10, 10], [5, 5], [0, 0]] // placed + rubber + closing
    const markers = displayed(ctx, state, { type: 'Polygon', coordinates: [ring] }, state.polygon.id)
    expect(markers.map((m) => m.geometry.coordinates)).toEqual([[0, 0], [10, 0], [10, 10]])
    expect(markers[0].properties).toEqual({ meta: 'draw-vertex', parent: state.polygon.id, active: 'false' })
  })

  test('every placed line vertex gets a marker', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    const coords = [[5, 5], [8, 8]] // placed + rubber
    const markers = displayed(ctx, state, { type: 'LineString', coordinates: coords }, state.line.id)
    expect(markers.map((m) => m.geometry.coordinates)).toEqual([[5, 5]])
  })

  test('other features get no markers', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    const ring = [[0, 0], [10, 0], [10, 10], [0, 0]]
    expect(displayed(ctx, state, { type: 'Polygon', coordinates: [ring] }, 'other-feature')).toEqual([])
  })
})
