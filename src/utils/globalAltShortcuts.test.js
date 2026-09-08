import { GLOBAL_ALT_KEYS, stopIfGlobalAltKey } from './globalAltShortcuts.js'

describe('GLOBAL_ALT_KEYS', () => {
  test('lists the arrow keys and Enter — the combos keyboardMappings.js binds globally under Alt', () => {
    expect([...GLOBAL_ALT_KEYS].sort()).toEqual(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter'].sort())
  })
})

describe('stopIfGlobalAltKey', () => {
  test.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'])('stops propagation for Alt+%s', (key) => {
    const e = { altKey: true, key, stopPropagation: jest.fn() }
    stopIfGlobalAltKey(e)
    expect(e.stopPropagation).toHaveBeenCalled()
  })

  test('leaves the same keys alone without Alt held', () => {
    const e = { altKey: false, key: 'ArrowUp', stopPropagation: jest.fn() }
    stopIfGlobalAltKey(e)
    expect(e.stopPropagation).not.toHaveBeenCalled()
  })

  test('leaves an Alt+<other key> alone — nothing global uses this combo', () => {
    const e = { altKey: true, key: 'i', stopPropagation: jest.fn() }
    stopIfGlobalAltKey(e)
    expect(e.stopPropagation).not.toHaveBeenCalled()
  })
})
