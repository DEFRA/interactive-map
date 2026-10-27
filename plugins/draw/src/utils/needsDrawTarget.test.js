import { needsDrawTarget } from './needsDrawTarget.js'

const mapControlsOpen = new Set(['mapControls'])
const closed = new Set()

const check = (interfaceType, expandedButtons, mode = 'draw_polygon') =>
  needsDrawTarget({ appState: { interfaceType, expandedButtons }, pluginState: { mode } })

describe('needsDrawTarget', () => {
  test.each([
    ['touch', closed, true],
    ['mouse', closed, false],
    ['keyboard', closed, false],
    ['touch', mapControlsOpen, true],
    ['mouse', mapControlsOpen, true],
    ['keyboard', mapControlsOpen, true]
  ])('%s, map controls %p: %s', (interfaceType, expandedButtons, expected) => {
    expect(check(interfaceType, expandedButtons)).toBe(expected)
  })

  test.each(['draw_line', 'draw_point'])('applies to %s', (mode) => {
    expect(check('touch', closed, mode)).toBe(true)
  })

  test.each(['edit_vertex', 'edit_point', null])('is false in %s, even on touch with map controls open', (mode) => {
    expect(check('touch', mapControlsOpen, mode)).toBe(false)
  })

  test('is false while a finished shape is held waiting on its check', () => {
    expect(needsDrawTarget({ appState: { interfaceType: 'touch', expandedButtons: mapControlsOpen }, pluginState: { mode: 'draw_polygon', holding: true } })).toBe(false)
  })

  test('treats a missing expandedButtons as map controls closed', () => {
    expect(check('mouse', undefined)).toBe(false)
  })
})
