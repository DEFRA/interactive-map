import { setupTouchClickWorkaround } from './touchClickWorkaround.js'

const createCanvas = () => {
  const listeners = {}
  return {
    addEventListener: jest.fn((type, handler) => { listeners[type] = handler }),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    fire (type, event) { listeners[type]?.(event) }
  }
}

const touchStartEvent = (touches) => ({ touches })
const touchEndEvent = (changedTouches) => ({ changedTouches })

describe('setupTouchClickWorkaround', () => {
  let canvas
  let map
  let draw

  beforeEach(() => {
    canvas = createCanvas()
    map = { getCanvas: () => canvas }
    draw = { getMode: jest.fn(() => 'disabled') }
    jest.spyOn(Date, 'now')
  })

  afterEach(() => {
    Date.now.mockRestore()
  })

  test('registers passive touchstart/touchend listeners on the canvas', () => {
    setupTouchClickWorkaround(map, draw)
    expect(canvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })
    expect(canvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true })
  })

  test('synthesizes a click for a quick, stationary tap in disabled mode', () => {
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100)
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchstart', touchStartEvent([{ clientX: 50, clientY: 60 }]))
    canvas.fire('touchend', touchEndEvent([{ clientX: 52, clientY: 61 }]))

    expect(canvas.dispatchEvent).toHaveBeenCalledTimes(1)
    const dispatched = canvas.dispatchEvent.mock.calls[0][0]
    expect(dispatched).toBeInstanceOf(MouseEvent)
    expect(dispatched.type).toBe('click')
    expect(dispatched.clientX).toBe(52)
    expect(dispatched.clientY).toBe(61)
  })

  test('does not synthesize a click when the tap is too slow', () => {
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1400)
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchstart', touchStartEvent([{ clientX: 50, clientY: 60 }]))
    canvas.fire('touchend', touchEndEvent([{ clientX: 50, clientY: 60 }]))

    expect(canvas.dispatchEvent).not.toHaveBeenCalled()
  })

  test('does not synthesize a click when the finger moves too far', () => {
    Date.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100)
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchstart', touchStartEvent([{ clientX: 50, clientY: 60 }]))
    canvas.fire('touchend', touchEndEvent([{ clientX: 100, clientY: 60 }]))

    expect(canvas.dispatchEvent).not.toHaveBeenCalled()
  })

  test('ignores multi-touch gestures on touchstart', () => {
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchstart', touchStartEvent([{ clientX: 1, clientY: 1 }, { clientX: 2, clientY: 2 }]))
    canvas.fire('touchend', touchEndEvent([{ clientX: 1, clientY: 1 }]))

    expect(canvas.dispatchEvent).not.toHaveBeenCalled()
  })

  test('does nothing when the current mode is not disabled', () => {
    draw.getMode.mockReturnValue('draw_polygon')
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchstart', touchStartEvent([{ clientX: 50, clientY: 60 }]))
    canvas.fire('touchend', touchEndEvent([{ clientX: 50, clientY: 60 }]))

    expect(canvas.dispatchEvent).not.toHaveBeenCalled()
  })

  test('does nothing on touchend without a preceding single-finger touchstart', () => {
    setupTouchClickWorkaround(map, draw)

    canvas.fire('touchend', touchEndEvent([{ clientX: 50, clientY: 60 }]))

    expect(canvas.dispatchEvent).not.toHaveBeenCalled()
  })

  test('remove() detaches both listeners', () => {
    const { remove } = setupTouchClickWorkaround(map, draw)
    remove()
    expect(canvas.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(canvas.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function))
  })
})
