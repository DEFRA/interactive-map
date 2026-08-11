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

  it('shows crosshair on touch and hides when listbox has focus', () => {
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

  it('hides crosshair in keyboard mode until focus enters the map keyboard scope', () => {
    const container = appState.layoutRefs.appContainerRef.current
    const viewportEl = document.createElement('div')
    viewportEl.setAttribute('data-map-keyboard-scope', '')
    container.appendChild(viewportEl)
    appState.interfaceType = 'keyboard'

    renderHook(() => useCrossHairVisibility({ crossHair, enabled: true, selectMarkerOnly: false, appState }))

    // interfaceType is 'keyboard' but nothing in the map keyboard scope has focus yet
    expect(crossHair.hide).toHaveBeenCalled()
    expect(crossHair.fixAtCenter).not.toHaveBeenCalled()

    // Viewport gains focus — cursor keys now actually operate the map
    act(() => viewportEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.fixAtCenter).toHaveBeenCalled()

    // Focus moves elsewhere (e.g. a popup menu closed with Escape, which also
    // flips interfaceType to 'keyboard' but shouldn't leave the crosshair up)
    const menuEl = document.createElement('ul')
    menuEl.setAttribute('role', 'menu')
    container.appendChild(menuEl)
    act(() => menuEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.hide).toHaveBeenCalledTimes(2)
  })

  it('shows the crosshair for a control (e.g. MoveControl) that forwards arrow keys to the map without moving DOM focus onto the viewport', () => {
    const container = appState.layoutRefs.appContainerRef.current
    const moveControlButton = document.createElement('button')
    const moveControlScope = document.createElement('div')
    moveControlScope.setAttribute('data-map-keyboard-scope', '')
    moveControlScope.appendChild(moveControlButton)
    container.appendChild(moveControlScope)
    appState.interfaceType = 'keyboard'

    renderHook(() => useCrossHairVisibility({ crossHair, enabled: true, selectMarkerOnly: false, appState }))
    expect(crossHair.fixAtCenter).not.toHaveBeenCalled()

    // Focus lands on a direction button nested inside the scoped control, not
    // on the scope element itself — closest() must still pick it up.
    act(() => moveControlButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.fixAtCenter).toHaveBeenCalled()
  })

  it('does not touch the crosshair on a focus change while disabled, leaving another owner (e.g. draw mode) in control', () => {
    const container = appState.layoutRefs.appContainerRef.current
    const viewportEl = document.createElement('div')
    viewportEl.setAttribute('data-map-keyboard-scope', '')
    container.appendChild(viewportEl)
    appState.interfaceType = 'keyboard'

    // interact starts disabled (e.g. a draw session already took over) — the crosshair
    // is presumed to already be showing via that other owner, mirroring what
    // DrawInit.jsx/drawInput.js would have set moments earlier.
    renderHook(() => useCrossHairVisibility({ crossHair, enabled: false, selectMarkerOnly: false, appState }))
    crossHair.fixAtCenter.mockClear()
    crossHair.hide.mockClear()

    // Focus moves into the map keyboard scope (e.g. draw's deferred focus-to-viewport
    // after a menu selection) — interact must not call hide() here; it isn't the owner.
    act(() => viewportEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    expect(crossHair.hide).not.toHaveBeenCalled()
    expect(crossHair.fixAtCenter).not.toHaveBeenCalled()
  })

  it('does not show the crosshair for a menu-button Escape that never enters the map keyboard scope', () => {
    const container = appState.layoutRefs.appContainerRef.current
    const menuButton = document.createElement('button')
    container.appendChild(menuButton)
    appState.interfaceType = 'mouse'

    const { rerender } = renderHook(
      (props) => useCrossHairVisibility(props),
      { initialProps: { crossHair, enabled: true, selectMarkerOnly: false, appState } }
    )
    expect(crossHair.hide).toHaveBeenCalled()

    // Menu opened by mouse, focus lands on it, then Escape closes it and
    // returns focus to the instigating button — interfaceType flips to
    // 'keyboard' along the way, but the map keyboard scope was never entered.
    act(() => menuButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true })))
    appState = { ...appState, interfaceType: 'keyboard' }
    rerender({ crossHair, enabled: true, selectMarkerOnly: false, appState })

    expect(crossHair.fixAtCenter).not.toHaveBeenCalled()
  })
})
