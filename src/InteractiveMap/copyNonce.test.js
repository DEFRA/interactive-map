// webpack replaces __webpack_nonce__ at build time; under Jest it's a plain global
const loadWithCurrentScript = (currentScript) => {
  Object.defineProperty(document, 'currentScript', { value: currentScript, configurable: true })
  globalThis.__webpack_nonce__ = undefined
  jest.isolateModules(() => require('./copyNonce.js'))
  return globalThis.__webpack_nonce__
}

afterEach(() => {
  delete document.currentScript
  delete globalThis.__webpack_nonce__
})

describe('copyNonce', () => {
  test("copies the nonce from the script tag that's running", () => {
    expect(loadWithCurrentScript({ nonce: 'r4nd0m' })).toBe('r4nd0m')
  })

  test('leaves the nonce unset when the script tag has none', () => {
    expect(loadWithCurrentScript({ nonce: '' })).toBeUndefined()
  })

  test('leaves the nonce unset when no script tag is running', () => {
    expect(loadWithCurrentScript(null)).toBeUndefined()
  })
})
