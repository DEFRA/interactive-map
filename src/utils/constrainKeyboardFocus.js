export function constrainKeyboardFocus (containerEl, e) {
  if (e.key !== 'Tab') {
    return
  }

  const selectors = [
    'a[href]:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    '*[tabindex="0"]:not([disabled])'
  ]
  let focusableEls = Array.from(containerEl.querySelectorAll(selectors.join(',')))
  focusableEls = focusableEls.filter(focusableEl => !!focusableEl.offsetParent)

  // Help with testing
  if (focusableEls.length === 0) {
    return
  }

  const firstFocusableEl = focusableEls[0]
  const lastFocusableEl = focusableEls[focusableEls.length - 1]

  if (e.shiftKey && (document.activeElement === containerEl || document.activeElement === firstFocusableEl)) {
    lastFocusableEl.focus()
    e.preventDefault()
  }
  if (!e.shiftKey && (document.activeElement === lastFocusableEl)) {
    firstFocusableEl.focus()
    e.preventDefault()
  }
}
