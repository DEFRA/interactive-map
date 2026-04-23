import { renderHook, act } from '@testing-library/react'
import { useFeatureFocus } from './useFeatureFocus'

const makeRefs = ({ featuresEl = document.createElement('ul'), viewportEl = document.createElement('div') } = {}) => ({
  featuresRef: { current: featuresEl },
  viewportRef: { current: viewportEl }
})

describe('useFeatureFocus', () => {
  it('returns activeFeatureId as null initially', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))

    expect(result.current.activeFeatureId).toBeNull()
  })

  it('returns setActiveFeatureId and enterFeatures functions', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))

    expect(typeof result.current.setActiveFeatureId).toBe('function')
    expect(typeof result.current.enterFeatures).toBe('function')
  })

  it('setActiveFeatureId updates activeFeatureId', () => {
    const { result } = renderHook(() => useFeatureFocus(makeRefs()))

    act(() => { result.current.setActiveFeatureId('feature-1') })

    expect(result.current.activeFeatureId).toBe('feature-1')
  })

  describe('keydown listener', () => {
    it('does not attach listener when featuresRef.current is null', () => {
      const featuresEl = document.createElement('ul')
      const spy = jest.spyOn(featuresEl, 'addEventListener')
      const refs = { featuresRef: { current: null }, viewportRef: { current: document.createElement('div') } }

      renderHook(() => useFeatureFocus(refs))

      expect(spy).not.toHaveBeenCalled()
    })

    it('attaches keydown listener to the features element', () => {
      const featuresEl = document.createElement('ul')
      const spy = jest.spyOn(featuresEl, 'addEventListener')

      renderHook(() => useFeatureFocus({ featuresRef: { current: featuresEl }, viewportRef: { current: document.createElement('div') } }))

      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('removes keydown listener on cleanup', () => {
      const featuresEl = document.createElement('ul')
      const spy = jest.spyOn(featuresEl, 'removeEventListener')

      const { unmount } = renderHook(() => useFeatureFocus({ featuresRef: { current: featuresEl }, viewportRef: { current: document.createElement('div') } }))

      unmount()

      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('calls preventDefault and focuses viewport on Escape', () => {
      const featuresEl = document.createElement('ul')
      const viewportEl = document.createElement('div')
      const focusSpy = jest.spyOn(viewportEl, 'focus')

      const addSpy = jest.spyOn(featuresEl, 'addEventListener')
      renderHook(() => useFeatureFocus({ featuresRef: { current: featuresEl }, viewportRef: { current: viewportEl } }))

      const handler = addSpy.mock.calls.find(c => c[0] === 'keydown')[1]
      const event = { key: 'Escape', preventDefault: jest.fn() }

      handler(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(focusSpy).toHaveBeenCalled()
    })

    it('does not focus viewport for keys other than Escape', () => {
      const featuresEl = document.createElement('ul')
      const viewportEl = document.createElement('div')
      const focusSpy = jest.spyOn(viewportEl, 'focus')

      const addSpy = jest.spyOn(featuresEl, 'addEventListener')
      renderHook(() => useFeatureFocus({ featuresRef: { current: featuresEl }, viewportRef: { current: viewportEl } }))

      const handler = addSpy.mock.calls.find(c => c[0] === 'keydown')[1]

      handler({ key: 'ArrowDown', preventDefault: jest.fn() })
      handler({ key: 'Enter', preventDefault: jest.fn() })

      expect(focusSpy).not.toHaveBeenCalled()
    })
  })

  describe('enterFeatures', () => {
    it('focuses the features element', () => {
      const featuresEl = document.createElement('ul')
      const focusSpy = jest.spyOn(featuresEl, 'focus')

      const { result } = renderHook(() => useFeatureFocus({ featuresRef: { current: featuresEl }, viewportRef: { current: document.createElement('div') } }))

      act(() => { result.current.enterFeatures() })

      expect(focusSpy).toHaveBeenCalled()
    })

    it('does nothing when featuresRef.current is null', () => {
      const refs = { featuresRef: { current: null }, viewportRef: { current: document.createElement('div') } }
      const { result } = renderHook(() => useFeatureFocus(refs))

      expect(() => act(() => { result.current.enterFeatures() })).not.toThrow()
    })
  })
})
