import { renderHook, act } from '@testing-library/react'
import { useHintsAPI } from './useHintsAPI.js'
import { useService } from '../store/serviceContext.js'
import { useApp } from '../store/appContext.js'

jest.mock('../store/serviceContext.js')
jest.mock('../store/appContext.js')

const makeEventBus = () => {
  const handlers = {}
  return {
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    off: jest.fn(),
    emit: (event, payload) => handlers[event]?.(payload),
    _handlers: handlers
  }
}

const makeHints = () => {
  let subscriber = null
  return {
    show: jest.fn(),
    dismiss: jest.fn(),
    subscribe: jest.fn((fn) => {
      subscriber = fn
      return () => { subscriber = null }
    }),
    _emit: (hint) => subscriber?.(hint)
  }
}

const pressEscape = (target) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('useHintsAPI', () => {
  let mockEventBus, mockHints, containerEl, insideEl, outsideEl

  beforeEach(() => {
    mockEventBus = makeEventBus()
    mockHints = makeHints()
    useService.mockReturnValue({ eventBus: mockEventBus, hints: mockHints })

    // Simulates this map instance's root DOM (layoutRefs.appContainerRef),
    // plus an element outside it — standing in for a second map instance,
    // or unrelated content elsewhere on the host page.
    containerEl = document.createElement('div')
    insideEl = document.createElement('button')
    containerEl.appendChild(insideEl)
    document.body.appendChild(containerEl)

    outsideEl = document.createElement('button')
    document.body.appendChild(outsideEl)

    useApp.mockReturnValue({ layoutRefs: { appContainerRef: { current: containerEl } } })
  })

  afterEach(() => {
    containerEl.remove()
    outsideEl.remove()
  })

  it('calls hints.show with text and options on app:showhint', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:showhint', { text: 'Press Enter to select', options: { duration: 2000 } }))
    expect(mockHints.show).toHaveBeenCalledWith('Press Enter to select', { duration: 2000 })
  })

  it('ignores app:showhint with no text', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:showhint', {}))
    act(() => mockEventBus.emit('app:showhint'))
    expect(mockHints.show).not.toHaveBeenCalled()
  })

  it('calls hints.dismiss on app:dismisshint', () => {
    renderHook(() => useHintsAPI())
    act(() => mockEventBus.emit('app:dismisshint'))
    expect(mockHints.dismiss).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useHintsAPI())
    unmount()
    expect(mockEventBus.off).toHaveBeenCalledWith('app:showhint', expect.any(Function))
    expect(mockEventBus.off).toHaveBeenCalledWith('app:dismisshint', expect.any(Function))
  })

  describe('Escape key', () => {
    it('dismisses the active hint when Escape originates inside this map instance', () => {
      renderHook(() => useHintsAPI())
      act(() => mockHints._emit({ html: 'Press Enter to select' }))

      act(() => pressEscape(insideEl))
      expect(mockHints.dismiss).toHaveBeenCalled()
    })

    it('does not dismiss when Escape originates outside this map instance', () => {
      // e.g. a second map instance on the page, or unrelated host-page content
      renderHook(() => useHintsAPI())
      act(() => mockHints._emit({ html: 'Press Enter to select' }))

      act(() => pressEscape(outsideEl))
      expect(mockHints.dismiss).not.toHaveBeenCalled()
    })

    it('does nothing on Escape when no hint is showing', () => {
      renderHook(() => useHintsAPI())
      act(() => pressEscape(insideEl))
      expect(mockHints.dismiss).not.toHaveBeenCalled()
    })

    it('stops reacting to Escape once the hint has been dismissed', () => {
      renderHook(() => useHintsAPI())
      act(() => mockHints._emit({ html: 'Press Enter to select' }))
      act(() => mockHints._emit(null)) // hints service reports no active hint

      act(() => pressEscape(insideEl))
      expect(mockHints.dismiss).not.toHaveBeenCalled()
    })

    it('falls back to dismissing when appContainerRef is not yet available', () => {
      useApp.mockReturnValue({ layoutRefs: { appContainerRef: { current: null } } })
      renderHook(() => useHintsAPI())
      act(() => mockHints._emit({ html: 'Press Enter to select' }))

      act(() => pressEscape(outsideEl))
      expect(mockHints.dismiss).toHaveBeenCalled()
    })

    it('removes the keydown listener on unmount', () => {
      const addSpy = jest.spyOn(document, 'addEventListener')
      const removeSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useHintsAPI())
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      unmount()
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })
})
