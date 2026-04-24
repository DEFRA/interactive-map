import { renderHook, act } from '@testing-library/react'
import { useFeatureFocus } from './useFeatureFocus.js'

const makeRefs = ({ viewportFocus } = {}) => ({
  viewportRef: { current: { focus: viewportFocus ?? jest.fn() } },
  featuresRef: { current: document.createElement('div') }
})

describe('useFeatureFocus — initial state', () => {
  it('activeFeatureId starts as null', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    expect(result.current.activeFeatureId).toBeNull()
  })

  it('setActiveFeatureId updates activeFeatureId', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))
    act(() => result.current.setActiveFeatureId('feature-1'))
    expect(result.current.activeFeatureId).toBe('feature-1')
  })
})

describe('useFeatureFocus — keydown listener', () => {
  it('does not attach listener when featuresRef.current is null', () => {
    const refs = { viewportRef: { current: { focus: jest.fn() } }, featuresRef: { current: null } }
    const spy = jest.spyOn(document.body, 'addEventListener')
    renderHook(() => useFeatureFocus(refs))
    expect(spy).not.toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
  })

  it('attaches and removes keydown listener on the features element', () => {
    const refs = makeRefs()
    const el = refs.featuresRef.current
    const addSpy = jest.spyOn(el, 'addEventListener')
    const removeSpy = jest.spyOn(el, 'removeEventListener')
    const { unmount } = renderHook(() => useFeatureFocus(refs))
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('Escape key focuses the viewport', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    renderHook(() => useFeatureFocus(refs))
    act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(viewportFocus).toHaveBeenCalled()
    el.remove()
  })

  it('non-Escape keys do not focus the viewport', () => {
    const viewportFocus = jest.fn()
    const refs = makeRefs({ viewportFocus })
    const el = refs.featuresRef.current
    document.body.appendChild(el)
    renderHook(() => useFeatureFocus(refs))
    act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })) })
    expect(viewportFocus).not.toHaveBeenCalled()
    el.remove()
  })
})

describe('useFeatureFocus — enterFeatures', () => {
  it('focuses the features element', () => {
    const refs = makeRefs()
    refs.featuresRef.current.focus = jest.fn()
    const { result } = renderHook(() => useFeatureFocus(refs))
    act(() => result.current.enterFeatures())
    expect(refs.featuresRef.current.focus).toHaveBeenCalled()
  })

  it('does not throw when featuresRef.current is null', () => {
    const refs = { viewportRef: { current: { focus: jest.fn() } }, featuresRef: { current: null } }
    const { result } = renderHook(() => useFeatureFocus(refs))
    expect(() => act(() => result.current.enterFeatures())).not.toThrow()
  })
})
