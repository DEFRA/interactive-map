/**
 * Detects whether the current platform is macOS.
 *
 * Prefers the modern User-Agent Client Hints API and falls back to the legacy
 * `navigator.platform`. Guarded so it is safe to call in non-browser
 * environments (Node/SSR/tests), where it returns `false`.
 *
 * @returns {boolean} True when running on macOS.
 */
export const isMac = () => {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /mac/i.test(navigator.userAgentData?.platform || navigator.platform || '')
}
