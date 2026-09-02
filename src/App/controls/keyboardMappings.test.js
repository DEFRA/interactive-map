describe('keyboardMappings', () => {
  beforeEach(() => jest.resetModules())

  const load = () => require('./keyboardMappings.js').keyboardMappings

  it('binds getInfo to Alt+i/Alt+I on Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })
    const { keyup } = load()
    expect(keyup['Alt+i']).toBe('getInfo')
    expect(keyup['Alt+I']).toBe('getInfo')
    expect(keyup['Ctrl+i']).toBeUndefined()
  })

  it('binds getInfo to Ctrl+i/Ctrl+I on non-Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true })
    const { keyup } = load()
    expect(keyup['Ctrl+i']).toBe('getInfo')
    expect(keyup['Ctrl+I']).toBe('getInfo')
    expect(keyup['Alt+i']).toBeUndefined()
  })
})
