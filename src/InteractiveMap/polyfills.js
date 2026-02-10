import ResizeObserver from 'resize-observer-polyfill'

// ResizeObserver
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = ResizeObserver
}

// Object.fromEntries
if (!Object.fromEntries) {
  Object.fromEntries = function (entries) {
    const obj = {}
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      obj[entry[0]] = entry[1]
    }
    return obj
  }
}
