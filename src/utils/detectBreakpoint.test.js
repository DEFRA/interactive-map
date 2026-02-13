// --- MOCKS ---
let rafQueue = []
global.requestAnimationFrame = jest.fn(cb => {
  rafQueue.push(cb)
  return rafQueue.length
})
global.cancelAnimationFrame = jest.fn()
const flushRAF = () => { rafQueue.forEach(cb => cb()); rafQueue = [] }

const mediaListeners = {}
let mockedQueries = {}

class MockResizeObserver {
  constructor (callback) { this.callback = callback }
  observe () { MockResizeObserver.instance = this }
  disconnect () { MockResizeObserver.instance = null }
  trigger (width, fallback) {
    this.callback([fallback ? { contentRect: { width } } : { borderBoxSize: [{ inlineSize: width }], contentRect: { width } }])
  }
}
MockResizeObserver.instance = null
global.ResizeObserver = MockResizeObserver

const mockMatchMedia = (query) => {
  const mq = {
    matches: false,
    media: query,
    addEventListener: jest.fn((e, fn) => e === 'change' && (mediaListeners[query] ||= []).push(fn)),
    removeEventListener: jest.fn((e, fn) => e === 'change' && (mediaListeners[query] = mediaListeners[query]?.filter(l => l !== fn)))
  }
  mockedQueries[query] = mq
  return mq
}

window.matchMedia = jest.fn(mockMatchMedia)

const triggerMQ = (query, matches) => {
  if (mockedQueries[query]) {
    mockedQueries[query].matches = matches
  }
  mediaListeners[query]?.forEach(fn => fn({ matches }))
}

// --- TESTS ---
describe('detectBreakpoint', () => {
  let createBreakpointDetector
  const cfg = { maxMobileWidth: 768, minDesktopWidth: 1024 }

  beforeEach(async () => {
    jest.resetModules()
    Object.keys(mediaListeners).forEach(k => delete mediaListeners[k])
    mockedQueries = {}
    MockResizeObserver.instance = null
    rafQueue = []
    const mod = await import('./detectBreakpoint')
    ;({ createBreakpointDetector } = mod)
  })

  it('returns desktop when matchMedia matches desktop', () => {
    window.matchMedia.mockImplementation(q => {
      const mq = mockMatchMedia(q)
      if (q === '(min-width: 1024px)') {
        mq.matches = true
      }
      return mq
    })
    const detector = createBreakpointDetector(cfg)
    flushRAF()
    expect(detector.getBreakpoint()).toBe('desktop')
    detector.destroy()
  })

  /**
   * Test to ensure coverage for the concurrency guard (Line 75).
   * Validates that if multiple breakpoint changes occur before a RAF
   * frame fires, only the most recent (current) state notifies listeners.
   */
  it('does not notify listeners if the breakpoint changed again before RAF fired', () => {
    const listener = jest.fn()
    const detector = createBreakpointDetector(cfg)
    detector.subscribe(listener)

    // 1. Initial flush to clear the "mount" notification
    flushRAF()
    listener.mockClear()

    // 2. Trigger 'mobile'.
    // This sets lastBreakpoint = 'mobile' and queues RAF #1 (type: 'mobile')
    triggerMQ('(max-width: 768px)', true)

    // 3. IMMEDIATELY switch to 'desktop' before flushing.
    // IMPORTANT: We must turn mobile OFF so the detector sees 'desktop'.
    triggerMQ('(max-width: 768px)', false)
    triggerMQ('(min-width: 1024px)', true)

    // At this point:
    // - lastBreakpoint is now 'desktop'
    // - There are 3 callbacks in the RAF queue:
    //   - RAF #1 from the mobile trigger (type: 'mobile')
    //   - RAF #2 from the mobile=false trigger (type: 'tablet')
    //   - RAF #3 from the desktop trigger (type: 'desktop')

    flushRAF()

    // RAF #1: ('mobile' === 'desktop') is false -> skip listener
    // RAF #2: ('tablet' === 'desktop') is false -> skip listener
    // RAF #3: ('desktop' === 'desktop') is true -> call listener
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('desktop')
    expect(detector.getBreakpoint()).toBe('desktop')
  })

  describe('viewport mode', () => {
    it.each([
      ['mobile', true, false],
      ['desktop', false, true],
      ['tablet', false, false]
    ])('detects %s', (name, mobile, desktop) => {
      window.matchMedia.mockImplementation(q => {
        const mq = mockMatchMedia(q)
        if (q === '(max-width: 768px)') {
          mq.matches = mobile
        }
        if (q === '(min-width: 1024px)') {
          mq.matches = desktop
        }
        return mq
      })
      const detector = createBreakpointDetector(cfg)
      flushRAF()
      expect(detector.getBreakpoint()).toBe(name)
      detector.destroy()
    })

    it('handles changes and cleanup', () => {
      const fn = jest.fn()
      const detector = createBreakpointDetector(cfg)
      const unsubscribe = detector.subscribe(fn)
      flushRAF()
      fn.mockClear()

      triggerMQ('(max-width: 768px)', true)
      flushRAF()
      expect(detector.getBreakpoint()).toBe('mobile')
      expect(fn).toHaveBeenCalledTimes(1)

      triggerMQ('(max-width: 768px)', true) // no change
      flushRAF()
      expect(fn).toHaveBeenCalledTimes(1)

      unsubscribe() // Test unsubscribe function
      triggerMQ('(min-width: 1024px)', true)
      flushRAF()
      expect(fn).toHaveBeenCalledTimes(1) // not called after unsubscribe

      detector.destroy()
    })
  })

  describe('container mode', () => {
    let el
    beforeEach(() => {
      el = document.createElement('div')
      el.getBoundingClientRect = jest.fn(() => ({ width: 800 }))
    })

    it.each([
      [500, 'mobile'],
      [800, 'tablet'],
      [1200, 'desktop']
    ])('detects width %i as %s', (width, expected) => {
      el.getBoundingClientRect.mockReturnValue({ width })
      const detector = createBreakpointDetector({ ...cfg, containerEl: el })
      flushRAF()
      expect(detector.getBreakpoint()).toBe(expected)
      expect(el.getAttribute('data-breakpoint')).toBe(expected)
      detector.destroy()
    })

    it('handles resize, fallback, and cleanup', () => {
      const fn = jest.fn()
      const detector = createBreakpointDetector({ ...cfg, containerEl: el })
      detector.subscribe(fn)
      flushRAF()
      fn.mockClear()

      MockResizeObserver.instance.trigger(500)
      flushRAF()
      expect(fn).toHaveBeenCalledTimes(1)

      MockResizeObserver.instance.trigger(500, true) // fallback path
      flushRAF()
      expect(detector.getBreakpoint()).toBe('mobile')

      detector.destroy()
      expect(el.style.containerType).toBe('')
    })

    it('multiple detectors are independent', () => {
      const el2 = document.createElement('div')
      el2.getBoundingClientRect = jest.fn(() => ({ width: 600 }))

      const detector1 = createBreakpointDetector({ ...cfg, containerEl: el })
      flushRAF()
      const detector2 = createBreakpointDetector({ ...cfg, containerEl: el2 })
      flushRAF()

      // Both detectors should maintain their own state
      expect(detector1.getBreakpoint()).toBe('tablet')
      expect(detector2.getBreakpoint()).toBe('mobile')

      detector1.destroy()
      detector2.destroy()
    })
  })

  it('handles destroy gracefully', () => {
    const detector = createBreakpointDetector(cfg)
    expect(() => detector.destroy()).not.toThrow()
  })
})
