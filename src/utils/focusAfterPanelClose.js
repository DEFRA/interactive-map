// Moves focus to the element that opened a closed panel, or to the map viewport if that element
// has since left the page (e.g. a Features-list item that dropped out of the list). Runs in the
// next frame so a modal panel has released its focus trap and inert state first.
export const focusAfterPanelClose = ({ triggeringElement, viewportRef, interfaceType }) => {
  requestAnimationFrame(() => {
    const focusTarget = triggeringElement && document.contains(triggeringElement) ? triggeringElement : viewportRef.current
    focusTarget?.focus?.({ preventScroll: interfaceType !== 'keyboard' })
  })
}
