const stripHtml = (html) => html.replace(/<[^>]*>/g, '')

/**
 * Creates the hint service. Manages a single active toast hint shown in the
 * KeyboardHints container. Calling hint() replaces any current hint and
 * restarts the dismiss timer. Internally calls announce() so screen readers
 * receive the message through the live region without callers needing to pair
 * the two calls manually.
 */
export function createHintManager (announce) {
  const subscribers = new Set()
  let current = null
  let timer = null

  const notify = () => subscribers.forEach(fn => fn(current))

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const dismiss = () => {
    clearTimer()
    current = null
    notify()
  }

  const hint = (html, options = {}) => {
    const { duration = 4000, announce: announceText } = options
    clearTimer()
    current = { html }
    notify()
    announce(announceText ?? stripHtml(html), 'plugin')
    if (duration > 0) {
      timer = setTimeout(dismiss, duration)
    }
  }

  const subscribe = (fn) => {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }

  return { hint, dismiss, subscribe }
}
