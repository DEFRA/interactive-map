describe('platform', () => {
  beforeEach(() => jest.resetModules())

  const load = () => require('./platform.js')

  it('detects Mac and returns Option key html', () => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true })
    const { isMac, altKeyHtml } = load()
    expect(isMac).toBe(true)
    expect(altKeyHtml).toBe('<kbd>Option</kbd>')
  })

  it('detects non-Mac and returns Alt key html', () => {
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true })
    const { isMac, altKeyHtml } = load()
    expect(isMac).toBe(false)
    expect(altKeyHtml).toBe('<kbd>Alt</kbd>')
  })
})
