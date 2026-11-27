import { setGeometry } from './setGeometry.js'

const polygon = { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] }

const makeContext = ({ mode = 'edit_vertex', current = { id: 'f1', geometry: { type: 'Polygon' } } } = {}) => {
  const draw = {
    getMode: jest.fn(() => mode),
    get: jest.fn(() => current),
    setGeometry: jest.fn()
  }
  return { context: { mapProvider: { draw }, pluginState: { feature: { id: 'f1' } } }, draw }
}

describe('setGeometry', () => {
  test('replaces the edited shape with a copy of the geometry', () => {
    const { context, draw } = makeContext()
    expect(setGeometry(context, polygon)).toBe(true)
    expect(draw.get).toHaveBeenCalledWith('f1')
    const [passed] = draw.setGeometry.mock.calls[0]
    expect(passed).toEqual(polygon)
    expect(passed.coordinates).not.toBe(polygon.coordinates)
  })

  test('works in a point edit too', () => {
    const { context, draw } = makeContext({ mode: 'edit_point', current: { id: 'f1', geometry: { type: 'Point' } } })
    expect(setGeometry(context, { type: 'Point', coordinates: [1, 2] })).toBe(true)
    expect(draw.setGeometry).toHaveBeenCalledWith({ type: 'Point', coordinates: [1, 2] })
  })

  test('does nothing outside an edit session', () => {
    const { context, draw } = makeContext({ mode: 'draw_polygon' })
    expect(setGeometry(context, polygon)).toBe(false)
    expect(draw.setGeometry).not.toHaveBeenCalled()
  })

  test('does nothing when the geometry type differs', () => {
    const { context, draw } = makeContext()
    expect(setGeometry(context, { type: 'LineString', coordinates: [[0, 0], [1, 1]] })).toBe(false)
    expect(draw.setGeometry).not.toHaveBeenCalled()
  })

  test('does nothing without a draw instance or an edited feature', () => {
    expect(setGeometry({ mapProvider: { draw: null }, pluginState: {} }, polygon)).toBe(false)
    const { context, draw } = makeContext({ current: null })
    expect(setGeometry(context, polygon)).toBe(false)
    expect(draw.setGeometry).not.toHaveBeenCalled()
  })
})
