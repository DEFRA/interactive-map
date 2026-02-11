describe('Polyfills', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  
  const originalCryptoUUID = crypto.randomUUID
  const originalCreateObjectURL = URL.createObjectURL
  const signalProto = Object.getPrototypeOf(new AbortController().signal)
  const originalThrowIfAborted = signalProto.throwIfAborted

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(crypto, 'randomUUID', {
      value: originalCryptoUUID,
      configurable: true,
      writable: true
    })
    
    URL.createObjectURL = originalCreateObjectURL
    
    if (originalThrowIfAborted) {
      signalProto.throwIfAborted = originalThrowIfAborted
    } else {
      delete signalProto.throwIfAborted
    }
  })

  const load = () => jest.isolateModules(() => require('./polyfills.js'))

  // Helper to read Blob text in environments without blob.text()
  const readBlobText = (blob) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsText(blob)
  })

  describe('crypto.randomUUID', () => {
    test('polyfills crypto.randomUUID when missing (Lines 3-8)', () => {
      Object.defineProperty(crypto, 'randomUUID', {
        value: undefined,
        configurable: true,
        writable: true
      })

      load()
      
      expect(typeof crypto.randomUUID).toBe('function')
      expect(crypto.randomUUID()).toMatch(UUID_RE)
    })

    test('crypto.randomUUID generates unique UUIDs', () => {
      Object.defineProperty(crypto, 'randomUUID', {
        value: undefined,
        configurable: true,
        writable: true
      })
      load()
      const ids = new Set(Array.from({ length: 100 }, () => crypto.randomUUID()))
      expect(ids.size).toBe(100)
    })

    test('does not overwrite existing crypto.randomUUID', () => {
      const fake = jest.fn(() => 'fake')
      Object.defineProperty(crypto, 'randomUUID', {
        value: fake,
        configurable: true,
        writable: true
      })
      load()
      expect(crypto.randomUUID).toBe(fake)
    })
  })
  
  describe('AbortSignal.throwIfAborted', () => {
    test('throws AbortError when aborted (True branch)', () => {
      delete signalProto.throwIfAborted
      load()
      const ac = new AbortController()
      ac.abort()
      expect(() => ac.signal.throwIfAborted()).toThrow('The operation was aborted.')
    })

    test('does nothing when not aborted (False branch)', () => {
      delete signalProto.throwIfAborted
      load()
      const ac = new AbortController()
      // This call should execute line 20, see that aborted is false, and return undefined
      expect(() => ac.signal.throwIfAborted()).not.toThrow()
    })

    test('wraps URL.createObjectURL for JS blobs', async () => {
      delete signalProto.throwIfAborted
      
      const mockCreate = jest.fn(() => 'blob:mock')
      URL.createObjectURL = mockCreate
      
      load()
      
      const content = 'console.log(1)'
      const blob = new Blob([content], { type: 'text/javascript' })
      const result = URL.createObjectURL(blob)
      
      expect(result).toBe('blob:mock')
      expect(mockCreate).toHaveBeenCalled()
      
      const passedBlob = mockCreate.mock.calls[0][0]
      const text = await readBlobText(passedBlob)
      
      expect(text).toContain('throwIfAborted')
      expect(text).toContain(content)
    })

    test('does not wrap URL.createObjectURL for non-JS blobs', () => {
      delete signalProto.throwIfAborted
      const mockCreate = jest.fn(() => 'blob:mock')
      URL.createObjectURL = mockCreate
      
      load()
      
      const blob = new Blob(['{}'], { type: 'application/json' })
      URL.createObjectURL(blob)
      
      expect(mockCreate).toHaveBeenCalledWith(blob)
    })
  })
})