function getBreakpointType (width, maxMobileWidth, minDesktopWidth) {
  if (width <= maxMobileWidth) {
    return 'mobile'
  }
  if (width >= minDesktopWidth) {
    return 'desktop'
  }
  return 'tablet'
}

function createContainerDetector (containerEl, getType, notifyListeners) {
  containerEl.style.containerType = 'inline-size'

  const initialWidth = containerEl.getBoundingClientRect().width
  const initialType = getType(initialWidth)
  containerEl.dataset.breakpoint = initialType

  const observer = new ResizeObserver((entries) => {
    const width = entries[0]?.borderBoxSize?.[0]?.inlineSize || entries[0]?.contentRect.width
    const type = getType(width)
    containerEl.dataset.breakpoint = type
    notifyListeners(type)
  })

  observer.observe(containerEl)

  return {
    initialType,
    cleanup: () => {
      observer.disconnect()
      containerEl.style.containerType = ''
      delete containerEl.dataset.breakpoint
    }
  }
}

function createViewportDetector (maxMobileWidth, minDesktopWidth, notifyListeners) {
  const mq = {
    mobile: window.matchMedia(`(max-width: ${maxMobileWidth}px)`),
    desktop: window.matchMedia(`(min-width: ${minDesktopWidth}px)`)
  }

  const detect = () => {
    let type = 'tablet'
    if (mq.mobile.matches) {
      type = 'mobile'
    } else if (mq.desktop.matches) {
      type = 'desktop'
    }
    notifyListeners(type)
  }

  mq.mobile.addEventListener('change', detect)
  mq.desktop.addEventListener('change', detect)
  detect()

  return {
    cleanup: () => {
      mq.mobile.removeEventListener('change', detect)
      mq.desktop.removeEventListener('change', detect)
    }
  }
}

function createBreakpointDetector ({ maxMobileWidth, minDesktopWidth, containerEl }) {
  let lastBreakpoint = 'unknown'
  const listeners = new Set()

  const notifyListeners = (type) => {
    if (type !== lastBreakpoint) {
      lastBreakpoint = type
      requestAnimationFrame(() => {
        if (lastBreakpoint === type) {
          listeners.forEach(fn => fn(type))
        }
      })
    }
  }

  const getType = (width) => getBreakpointType(width, maxMobileWidth, minDesktopWidth)

  let cleanup
  if (containerEl) {
    const detector = createContainerDetector(containerEl, getType, notifyListeners)
    lastBreakpoint = detector.initialType
    notifyListeners(detector.initialType)
    cleanup = detector.cleanup
  } else {
    const detector = createViewportDetector(maxMobileWidth, minDesktopWidth, notifyListeners)
    cleanup = detector.cleanup
  }

  return {
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getBreakpoint: () => lastBreakpoint,
    destroy: () => {
      cleanup?.()
      listeners.clear()
    }
  }
}

export { createBreakpointDetector }
