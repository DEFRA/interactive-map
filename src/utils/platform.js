/** True when running on macOS. */
const isMac = /mac/i.test(navigator.userAgentData?.platform ?? navigator.platform)

/**
 * An HTML string for the modifier key that activates Alt-based shortcuts.
 * Renders as `<kbd>Option</kbd>` on Mac and `<kbd>Alt</kbd>` elsewhere.
 * @type {string}
 */
const altKeyHtml = isMac ? '<kbd>Option</kbd>' : '<kbd>Alt</kbd>'

export {
  isMac,
  altKeyHtml
}
