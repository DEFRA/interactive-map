import { isMac } from './isMac.js'

describe('isMac', () => {
  const original = Object.getOwnPropertyDescriptor(global, 'navigator')

  afterEach(() => {
    if (original) {
      Object.defineProperty(global, 'navigator', original)
    } else {
      delete global.navigator
    }
  })

  const setNavigator = (value) => {
    Object.defineProperty(global, 'navigator', { value, configurable: true, writable: true })
  }

  test('returns false when navigator is undefined', () => {
    setNavigator(undefined)
    expect(isMac()).toBe(false)
  })

  test('detects macOS via userAgentData.platform', () => {
    setNavigator({ userAgentData: { platform: 'macOS' }, platform: '' })
    expect(isMac()).toBe(true)
  })

  test('falls back to navigator.platform', () => {
    setNavigator({ platform: 'MacIntel' })
    expect(isMac()).toBe(true)
  })

  test('returns false on non-mac platforms', () => {
    setNavigator({ userAgentData: { platform: 'Windows' }, platform: 'Win32' })
    expect(isMac()).toBe(false)
  })
})
