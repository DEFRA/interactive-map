// --- MOCK SETUP: Global Event Dispatcher ---

const eventListeners = {}
const mediaListeners = {}
let mockedMediaQuery

const mockMatchMedia = (query) => {
  const mediaQuery = {
    matches: false,
    media: query,
    addEventListener: jest.fn((event, fn) => {
      if (event === 'change') {
        if (!mediaListeners[query]) mediaListeners[query] = []
        mediaListeners[query].push(fn)
      }
    }),
    removeEventListener: jest.fn((event, fn) => {
      if (event === 'change' && mediaListeners[query]) {
        mediaListeners[query] = mediaListeners[query].filter(l => l !== fn)
      }
    })
  }
  mockedMediaQuery = mediaQuery
  return mediaQuery
}

const mockAddEventListener = jest.fn((event, handler) => {
  if (!eventListeners[event]) eventListeners[event] = []
  eventListeners[event].push(handler)
})

const mockRemoveEventListener = jest.fn((event, handler) => {
  if (eventListeners[event]) {
    eventListeners[event] = eventListeners[event].filter(h => h !== handler)
  }
})

Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn(mockMatchMedia) })
Object.defineProperty(window, 'addEventListener', { writable: true, value: mockAddEventListener })
Object.defineProperty(window, 'removeEventListener', { writable: true, value: mockRemoveEventListener })

// --- EVENT TRIGGER HELPERS ---

const triggerMediaChange = (matches) => {
  if (mockedMediaQuery) mockedMediaQuery.matches = matches
  const queryListeners = mediaListeners['(pointer: coarse)']
  if (queryListeners) queryListeners.forEach(fn => fn({ matches }))
}

const triggerDomEvent = (event, payload) => {
  const handlers = eventListeners[event]
  if (handlers) handlers.forEach(handler => handler(payload))
}

// --- TEST SUITE ---
describe('Interface Detector Utility Module', () => {
  let createInterfaceDetector, getInterfaceType, subscribeToInterfaceChanges, subscribeToInterfaceChangesImmediate
  let cleanup

  beforeEach(async () => {
    jest.resetModules()
    jest.useFakeTimers()

    window.matchMedia.mockImplementationOnce((query) => {
      const mock = mockMatchMedia(query)
      mock.matches = false
      return mock
    })

    const importedModule = await import('./detectInterfaceType.js')

    createInterfaceDetector = importedModule.createInterfaceDetector
    getInterfaceType = importedModule.getInterfaceType
    subscribeToInterfaceChanges = importedModule.subscribeToInterfaceChanges
    subscribeToInterfaceChangesImmediate = importedModule.subscribeToInterfaceChangesImmediate

    Object.keys(eventListeners).forEach(key => delete eventListeners[key])
    Object.keys(mediaListeners).forEach(key => delete mediaListeners[key])
    window.matchMedia.mockClear()
    window.addEventListener.mockClear()
    window.removeEventListener.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize to "mouse" and fall back correctly if type is unknown', () => {
    expect(getInterfaceType()).toBe('mouse')
    cleanup = createInterfaceDetector()
    expect(getInterfaceType()).toBe('mouse')
  })

  it('should handle all three event types, notify listeners only on change, and run cleanup', () => {
    const handler = jest.fn()

    const unsubscribe = subscribeToInterfaceChanges(handler)
    cleanup = createInterfaceDetector()
    handler.mockClear()

    // --- Path 1a: pointerdown 'touch' ---
    triggerDomEvent('pointerdown', { pointerType: 'touch' })
    expect(getInterfaceType()).toBe('touch') // synchronous update
    expect(handler).not.toHaveBeenCalled() // listener still pending
    jest.advanceTimersByTime(150)
    expect(handler).toHaveBeenCalledWith('touch')
    handler.mockClear()

    // --- Path 1b: pointerdown 'pen' ---
    triggerDomEvent('pointerdown', { pointerType: 'pen' })
    jest.advanceTimersByTime(150)
    expect(handler).not.toHaveBeenCalled() // 'pen' normalises to 'touch' — no change

    // --- Path 1c: pointerdown 'mouse' ---
    triggerDomEvent('pointerdown', { pointerType: 'mouse' })
    expect(getInterfaceType()).toBe('mouse') // synchronous update
    expect(handler).not.toHaveBeenCalled() // listener still pending
    jest.advanceTimersByTime(150)
    expect(getInterfaceType()).toBe('mouse')
    expect(handler).toHaveBeenCalledWith('mouse')
    handler.mockClear()

    // --- Path 1d: pointerdown 'weird' ---
    triggerDomEvent('pointerdown', { pointerType: 'weird' })
    jest.advanceTimersByTime(150)
    expect(getInterfaceType()).toBe('mouse')
    expect(handler).toHaveBeenCalledWith('unknown')
    handler.mockClear()

    // --- Path 2: keydown 'Tab' ---
    triggerDomEvent('keydown', { key: 'Tab' })
    expect(getInterfaceType()).toBe('keyboard')
    expect(handler).toHaveBeenCalledWith('keyboard')
    handler.mockClear()

    // Tab again when already keyboard — notifyListeners no-op branch
    triggerDomEvent('keydown', { key: 'Tab' })
    expect(handler).not.toHaveBeenCalled()

    // keydown with non-Tab
    triggerDomEvent('keydown', { key: 'a' })
    expect(handler).not.toHaveBeenCalled()

    // --- Path 3: matchMedia ---
    triggerMediaChange(true)
    expect(getInterfaceType()).toBe('touch')
    expect(handler).toHaveBeenCalledWith('touch')
    handler.mockClear()

    triggerMediaChange(false)
    expect(getInterfaceType()).toBe('mouse')
    expect(handler).toHaveBeenCalledWith('mouse')
    handler.mockClear()

    cleanup()
    unsubscribe()

    // Verify events no longer fire after cleanup
    triggerDomEvent('keydown', { key: 'Tab' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('subscribeToInterfaceChangesImmediate fires synchronously and unsubscribes', () => {
    const handler = jest.fn()
    const unsubscribe = subscribeToInterfaceChangesImmediate(handler)
    cleanup = createInterfaceDetector()

    triggerDomEvent('pointerdown', { pointerType: 'touch' })
    expect(handler).toHaveBeenCalledWith('touch') // fires before timer advance

    // Tab keydown goes through notifyListeners — exercises immediate forEach callback
    triggerDomEvent('keydown', { key: 'Tab' })
    expect(handler).toHaveBeenCalledWith('keyboard')
    expect(handler).toHaveBeenCalledTimes(2)

    unsubscribe()
    triggerDomEvent('pointerdown', { pointerType: 'mouse' })
    expect(handler).toHaveBeenCalledTimes(2) // no longer called after unsubscribe
  })

  it('should return "touch" when matchMedia initially matches coarse pointer', async () => {
    jest.resetModules()

    window.matchMedia.mockImplementationOnce((query) => {
      const mock = mockMatchMedia(query)
      mock.matches = true
      return mock
    })

    const importedModule = await import('./detectInterfaceType.js')
    getInterfaceType = importedModule.getInterfaceType
    expect(getInterfaceType()).toBe('touch')
  })
})
