// polyfills.test.js
describe('Polyfills', () => {
  beforeEach(() => {
    // remove globals to simulate missing polyfills
    delete window.ResizeObserver
    delete Object.fromEntries
  })

  test('should polyfill ResizeObserver', () => {
    // Side-effect import
    jest.isolateModules(() => {
      require('./polyfills.js') // adjust path
    })

    expect(window.ResizeObserver).toBeDefined()
    expect(typeof window.ResizeObserver).toBe('function')
    expect(window.ResizeObserver.prototype.observe).toBeDefined()
    expect(window.ResizeObserver.prototype.disconnect).toBeDefined()
  })

  test('should polyfill Object.fromEntries', () => {
    jest.isolateModules(() => {
      require('./polyfills.js')
    })

    expect(Object.fromEntries).toBeDefined()
    const entries = [['a', 1], ['b', 2]]
    expect(Object.fromEntries(entries)).toEqual({ a: 1, b: 2 })
  })

  test('should not overwrite existing window.ResizeObserver', () => {
    const fakeObserver = jest.fn()
    window.ResizeObserver = fakeObserver

    jest.isolateModules(() => {
      require('./polyfills.js')
    })

    // Should remain unchanged
    expect(window.ResizeObserver).toBe(fakeObserver)
  })

  test('should not overwrite existing Object.fromEntries', () => {
    const fakeFromEntries = jest.fn()
    Object.fromEntries = fakeFromEntries

    jest.isolateModules(() => {
      require('./polyfills.js')
    })

    expect(Object.fromEntries).toBe(fakeFromEntries)
  })
})
