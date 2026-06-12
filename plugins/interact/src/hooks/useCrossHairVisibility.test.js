import { act, renderHook } from '@testing-library/react'
import { useCrossHairVisibility } from './useCrossHairVisibility.js'

let crossHair
let appState

beforeEach(() => {
  crossHair = { fixAtCenter: jest.fn(), hide: jest.fn() }
  appState = {
    interfaceType: 'mouse',
    layoutRefs: { appContainerRef: { current: document.createElement('div') } }
  }
})

describe('useCrossHairVisibility', () => {
  it('skips listbox focus listeners when appContainerRef is null', () => {
    appState.layoutRefs.appContainerRef = { current: null }
    renderHook(() => useCrossHairVisibility({ crossHair, enabled: true, selectMarkerOnly: false, appState }))
    expect(crossHair.hide).toHaveBeenCalled()
  })

  it('shows crosshair on touch/keyboard and hides when listbox has focus', () => {
    const container = appState.layoutRefs.appContainerRef.current
    appState.interfaceType = 'touch'
    renderHook(() => useCrossHairVisibility({ crossHair, enabled: true, selectMarkerOnly: false, appState }))

    expect(crossHair.fixAtCenter).toHaveBeenCalled()

    // Focus moves into listbox — hide
    const listboxEl = document.createElement('div')
    listboxEl.setAttribute('role', 'listbox')
    container.appendChild(listboxEl)
    act(() => listboxEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.hide).toHaveBeenCalled()

    // Second focusin still inside listbox — no-op (state unchanged)
    const listboxEl2 = document.createElement('div')
    listboxEl2.setAttribute('role', 'listbox')
    container.appendChild(listboxEl2)
    act(() => listboxEl2.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.hide).toHaveBeenCalledTimes(1)

    // Focus moves back out of listbox — show again
    const otherEl = document.createElement('div')
    container.appendChild(otherEl)
    act(() => otherEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.fixAtCenter).toHaveBeenCalledTimes(2)
  })
})
