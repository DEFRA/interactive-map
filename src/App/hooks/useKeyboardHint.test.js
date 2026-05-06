import { renderHook, act } from '@testing-library/react'
import { useKeyboardHint } from './useKeyboardHint'
import { getInterfaceType } from '../../utils/detectInterfaceType.js'

jest.mock('../../utils/detectInterfaceType.js', () => ({
  getInterfaceType: jest.fn(() => 'keyboard')
}))

const defaultProps = (overrides = {}) => ({
  containerRef: { current: document.createElement('div') },
  onViewportFocusChange: jest.fn(),
  ...overrides
})

// ─── return shape ─────────────────────────────────────────────────────────────

describe('useKeyboardHint — return shape', () => {
  test('returns focus and blur handlers', () => {
    const { result } = renderHook(() => useKeyboardHint(defaultProps()))
    expect(typeof result.current.handleFocus).toBe('function')
    expect(typeof result.current.handleBlur).toBe('function')
  })
})

// ─── keydown listener ────────────────────────────────────────────────────────

describe('useKeyboardHint — keydown listener', () => {
  test('Escape calls onViewportFocusChange(false)', () => {
    const props = defaultProps()
    renderHook(() => useKeyboardHint(props))
    act(() => {
      props.containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(props.onViewportFocusChange).toHaveBeenCalledWith(false)
  })

  test('non-Escape keydown does not call onViewportFocusChange', () => {
    const props = defaultProps()
    renderHook(() => useKeyboardHint(props))
    act(() => {
      props.containerRef.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })
    expect(props.onViewportFocusChange).not.toHaveBeenCalled()
  })

  test('does nothing when containerRef.current is null', () => {
    const props = defaultProps({ containerRef: { current: null } })
    expect(() => renderHook(() => useKeyboardHint(props))).not.toThrow()
  })

  test('cleanup removes keydown listener on unmount', () => {
    const props = defaultProps()
    const spy = jest.spyOn(props.containerRef.current, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardHint(props))
    unmount()
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})

// ─── handleFocus / handleBlur ─────────────────────────────────────────────────

describe('useKeyboardHint — handleFocus / handleBlur', () => {
  beforeEach(() => getInterfaceType.mockReturnValue('keyboard'))

  test('handleFocus calls onViewportFocusChange(true) for keyboard interface', () => {
    const props = defaultProps()
    const { result } = renderHook(() => useKeyboardHint(props))
    act(() => result.current.handleFocus())
    expect(props.onViewportFocusChange).toHaveBeenCalledWith(true)
  })

  test('handleFocus does not call onViewportFocusChange for non-keyboard interface', () => {
    getInterfaceType.mockReturnValue('mouse')
    const props = defaultProps()
    const { result } = renderHook(() => useKeyboardHint(props))
    act(() => result.current.handleFocus())
    expect(props.onViewportFocusChange).not.toHaveBeenCalled()
  })

  test('handleBlur always calls onViewportFocusChange(false)', () => {
    const props = defaultProps({ interfaceType: 'mouse' })
    const { result } = renderHook(() => useKeyboardHint(props))
    act(() => result.current.handleBlur())
    expect(props.onViewportFocusChange).toHaveBeenCalledWith(false)
  })
})
