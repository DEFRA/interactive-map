const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const originalCryptoUUID = crypto.randomUUID
const originalCreateObjectURL = URL.createObjectURL
const originalHasOwn = Object.hasOwn
const originalWorker = globalThis.Worker
const signalProto = Object.getPrototypeOf(new AbortController().signal)
const originalThrowIfAborted = signalProto.throwIfAborted

beforeEach(() => { jest.resetModules() })

afterEach(() => {
  Object.defineProperty(crypto, 'randomUUID', { value: originalCryptoUUID, configurable: true, writable: true })
  URL.createObjectURL = originalCreateObjectURL
  Object.hasOwn = originalHasOwn
  globalThis.Worker = originalWorker
  if (originalThrowIfAborted) {
    signalProto.throwIfAborted = originalThrowIfAborted
  } else {
    delete signalProto.throwIfAborted
  }
})

const load = () => jest.isolateModules(() => require('./polyfills.js'))

const readBlobText = (blob) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.readAsText(blob) // NOSONAR: Blob#text() is not available in this jsdom version
})

// ─── crypto.randomUUID ───────────────────────────────────────────────────────

describe('crypto.randomUUID', () => {
  const nullifyUUID = () => Object.defineProperty(crypto, 'randomUUID', { value: null, configurable: true, writable: true })

  test('polyfills crypto.randomUUID when missing', () => {
    nullifyUUID()
    load()
    expect(typeof crypto.randomUUID).toBe('function')
    expect(crypto.randomUUID()).toMatch(UUID_RE)
  })

  test('generates unique UUIDs', () => {
    nullifyUUID()
    load()
    const ids = new Set(Array.from({ length: 100 }, () => crypto.randomUUID()))
    expect(ids.size).toBe(100)
  })

  test('does not overwrite existing crypto.randomUUID', () => {
    const fake = jest.fn(() => 'fake')
    Object.defineProperty(crypto, 'randomUUID', { value: fake, configurable: true, writable: true })
    load()
    expect(crypto.randomUUID).toBe(fake)
  })
})

// ─── Object.hasOwn ───────────────────────────────────────────────────────────

describe('Object.hasOwn', () => {
  test('polyfills Object.hasOwn when missing', () => {
    delete Object.hasOwn
    load()
    expect(typeof Object.hasOwn).toBe('function')
    expect(Object.hasOwn({ a: 1 }, 'a')).toBe(true)
    expect(Object.hasOwn({ a: 1 }, 'b')).toBe(false)
  })

  test('does not overwrite existing Object.hasOwn', () => {
    const fake = jest.fn()
    Object.hasOwn = fake
    load()
    expect(Object.hasOwn).toBe(fake)
  })
})

// ─── AbortSignal.throwIfAborted ───────────────────────────────────────────────

describe('AbortSignal.throwIfAborted', () => {
  test('throws AbortError when aborted', () => {
    delete signalProto.throwIfAborted
    load()
    const ac = new AbortController()
    ac.abort()
    expect(() => ac.signal.throwIfAborted()).toThrow('The operation was aborted.')
  })

  test('does nothing when not aborted', () => {
    delete signalProto.throwIfAborted
    load()
    expect(() => new AbortController().signal.throwIfAborted()).not.toThrow()
  })

  test('wraps URL.createObjectURL for JS blobs', async () => {
    delete signalProto.throwIfAborted
    const mockCreate = jest.fn(() => 'blob:mock')
    URL.createObjectURL = mockCreate
    load()

    URL.createObjectURL(new Blob(['console.log(1)'], { type: 'text/javascript' }))
    const text = await readBlobText(mockCreate.mock.calls[0][0])
    expect(text).toContain('throwIfAborted')
    expect(text).toContain('console.log(1)')
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

// ─── Worker constructor (string workerUrl) ────────────────────────────────────

describe('Worker constructor (string workerUrl)', () => {
  const setupWorkerMock = () => {
    const MockWorker = jest.fn()
    MockWorker.prototype = {}
    globalThis.Worker = MockWorker
    return MockWorker
  }

  test('wraps Worker with string URL to inject polyfill via importScripts', async () => {
    delete Object.hasOwn
    const MockWorker = setupWorkerMock()
    const mockCreate = jest.fn(() => 'blob:injected')
    URL.createObjectURL = mockCreate
    load()

    expect(new Worker('/worker.js')).toBeDefined()
    const text = await readBlobText(mockCreate.mock.calls[0][0])
    expect(text).toContain('Object.hasOwn')
    expect(text).toContain('importScripts("/worker.js")')
    expect(MockWorker).toHaveBeenCalledWith('blob:injected', undefined)
  })

  test('passes blob URLs through without wrapping', () => {
    delete Object.hasOwn
    const MockWorker = setupWorkerMock()
    const mockCreate = jest.fn(() => 'blob:new')
    URL.createObjectURL = mockCreate
    load()

    expect(new Worker('blob:http://localhost/existing')).toBeDefined()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(MockWorker).toHaveBeenCalledWith('blob:http://localhost/existing', undefined)
  })

  test('preserves the Worker prototype', () => {
    delete Object.hasOwn
    const MockWorker = setupWorkerMock()
    const mockProto = { foo: 'bar' }
    MockWorker.prototype = mockProto
    load()

    expect(Worker.prototype).toBe(mockProto)
  })
})
