import { renderHook } from '@testing-library/react'
import { useFocusVisible } from './useFocusVisible'
import { useApp } from '../store/appContext.js'
import { getInterfaceType } from '../../utils/detectInterfaceType.js'

jest.mock('../store/appContext.js')
jest.mock('../../utils/detectInterfaceType.js', () => ({
  getInterfaceType: jest.fn(() => 'keyboard')
}))

describe('useFocusVisible', () => {
  let mockAppContainerRef, addEventListenerSpy, removeEventListenerSpy

  beforeEach(() => {
    mockAppContainerRef = { current: document.createElement('div') }

    addEventListenerSpy = jest.spyOn(document, 'addEventListener')
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

    getInterfaceType.mockReturnValue('keyboard')
    useApp.mockReturnValue({
      layoutRefs: { appContainerRef: mockAppContainerRef }
    })
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('returns early when no scope', () => {
    useApp.mockReturnValue({
      layoutRefs: { appContainerRef: { current: null } }
    })

    renderHook(() => useFocusVisible())

    // Ensure our hook did NOT attach its listeners
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('focusout', expect.any(Function))
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('pointerdown', expect.any(Function))
  })

  it('attaches event listeners', () => {
    renderHook(() => useFocusVisible())

    expect(addEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('focusout', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
  })

  it('sets focusVisible on focusin when keyboard interface', () => {
    renderHook(() => useFocusVisible())

    const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'focusin')[1]
    const target = document.createElement('button')

    handler({ target })

    expect(target.dataset.focusVisible).toBe('true')
  })

  it('does not set focusVisible on focusin when not keyboard', () => {
    getInterfaceType.mockReturnValue('touch')

    renderHook(() => useFocusVisible())

    const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'focusin')[1]
    const target = document.createElement('button')

    handler({ target })

    // interfaceType === 'touch' → dataset.focusVisible = "false"
    expect(target.dataset.focusVisible).toBe('false')
  })

  it('removes focusVisible on focusout', () => {
    renderHook(() => useFocusVisible())

    const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'focusout')[1]
    const target = document.createElement('button')
    target.dataset.focusVisible = 'true'

    handler({ target })

    expect(target.dataset.focusVisible).toBeUndefined()
  })

  it('removes focusVisible on pointerdown', () => {
    const activeElement = document.createElement('button')
    activeElement.dataset.focusVisible = 'true'

    jest.spyOn(document, 'activeElement', 'get').mockReturnValue(activeElement)

    renderHook(() => useFocusVisible())

    const handler = addEventListenerSpy.mock.calls.find(c => c[0] === 'pointerdown')[1]

    handler({})

    expect(activeElement.dataset.focusVisible).toBeUndefined()
  })

  it('removes event listeners on cleanup', () => {
    const { unmount } = renderHook(() => useFocusVisible())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('focusout', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
  })
})
