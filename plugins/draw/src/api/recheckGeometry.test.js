import { recheckGeometry } from './recheckGeometry.js'
import { getCommitChecks } from '../validation/commitChecks.js'

const square = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] } }

const makeDraw = (mode = 'edit_vertex') => ({ getMode: jest.fn(() => mode) })

describe('recheckGeometry', () => {
  test('checks the last checked shape again with phase recheck', () => {
    const draw = makeDraw()
    draw._commitValidator = jest.fn()
      .mockReturnValueOnce({ valid: false, reason: 'near a parcel' })
      .mockReturnValueOnce(true)
    const checks = getCommitChecks(draw)
    checks.run({ feature: square, context: { phase: 'change', mode: 'edit_vertex' }, onGeometryChange: draw._commitValidator })
    expect(checks.state.status).toBe('invalid')

    expect(recheckGeometry({ mapProvider: { draw } })).toBe(true)
    expect(draw._commitValidator).toHaveBeenLastCalledWith(
      { feature: square, phase: 'recheck', mode: 'edit_vertex' },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(checks.state.status).toBe('valid')
  })

  test('passes a detail through to onGeometryChange', () => {
    const draw = makeDraw()
    draw._commitValidator = jest.fn(() => true)
    getCommitChecks(draw).run({ feature: square, context: { phase: 'change', mode: 'edit_vertex' }, onGeometryChange: draw._commitValidator })
    recheckGeometry({ mapProvider: { draw } }, { refresh: false })
    expect(draw._commitValidator).toHaveBeenLastCalledWith(
      { feature: square, phase: 'recheck', mode: 'edit_vertex', detail: { refresh: false } },
      expect.anything()
    )
  })

  test('does nothing before the shape has been checked', () => {
    const draw = makeDraw()
    draw._commitValidator = jest.fn()
    expect(recheckGeometry({ mapProvider: { draw } })).toBe(false)
    expect(draw._commitValidator).not.toHaveBeenCalled()
  })

  test('does nothing outside a draw/edit session', () => {
    const draw = makeDraw('disabled')
    draw._commitValidator = jest.fn(() => true)
    getCommitChecks(draw).run({ feature: square, context: { phase: 'change' } })
    expect(recheckGeometry({ mapProvider: { draw } })).toBe(false)
    expect(draw._commitValidator).not.toHaveBeenCalled()
  })

  test('does nothing without a draw instance', () => {
    expect(recheckGeometry({ mapProvider: { draw: null } })).toBe(false)
  })
})
