describe('keyboardShortcuts', () => {
  beforeEach(() => jest.resetModules())

  const load = () => require('./keyboardShortcuts.js').coreShortcuts

  const altShortcuts = (shortcuts) =>
    shortcuts.filter(s => s.command?.includes('Alt') || s.command?.includes('Option'))

  it('uses Option key label on Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })
    const shortcuts = load()
    altShortcuts(shortcuts).forEach(s => {
      expect(s.command).toContain('<kbd>Option</kbd>')
    })
  })

  it('uses Alt key label on non-Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true })
    const shortcuts = load()
    altShortcuts(shortcuts).forEach(s => {
      expect(s.command).toContain('<kbd>Alt</kbd>')
    })
  })

  it('marks getInfo as visuallyHidden, map-provider-agnostic and requiring reverseGeocodeProvider', () => {
    const shortcuts = load()
    const getInfo = shortcuts.find(s => s.id === 'getInfo')
    expect(getInfo).toMatchObject({
      visuallyHidden: true,
      mapProviderAgnostic: true,
      requiredConfig: ['reverseGeocodeProvider']
    })
  })

  it('uses Ctrl for getInfo on non-Mac and Option on Mac', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })
    let getInfo = load().find(s => s.id === 'getInfo')
    expect(getInfo.command).toContain('<kbd>Option</kbd>')

    jest.resetModules()
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true })
    getInfo = load().find(s => s.id === 'getInfo')
    expect(getInfo.command).toContain('<kbd>Ctrl</kbd>')
  })
})
