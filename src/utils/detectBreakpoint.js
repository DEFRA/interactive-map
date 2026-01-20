function createBreakpointDetector ({ maxMobileWidth, minDesktopWidth, containerEl }) {
  let lastBreakpoint = 'unknown'
  const listeners = new Set()
  let cleanup = null

  const getBreakpointType = (width) => {
    if (width <= maxMobileWidth) {
      return 'mobile'
    }
    if (width >= minDesktopWidth) {
      return 'desktop'
    }
    return 'tablet'
  }

  const notifyListeners = (type) => {
    if (type !== lastBreakpoint) {
      lastBreakpoint = type // Set synchronously BEFORE RAF
      requestAnimationFrame(() => {
        // Double-check it hasn't changed again
        if (lastBreakpoint === type) {
          listeners.forEach(fn => fn(type))
        }
      })
    }
  }

  // Container-based detection
  if (containerEl) {
    containerEl.style.containerType = 'inline-size'

    // Set initial detection BEFORE observing to prevent double notification
    const initialWidth = containerEl.getBoundingClientRect().width
    const initialType = getBreakpointType(initialWidth)
    containerEl.setAttribute('data-breakpoint', initialType)
    lastBreakpoint = initialType // Set this directly, don't notify yet

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.borderBoxSize?.[0]?.inlineSize || entries[0]?.contentRect.width
      const type = getBreakpointType(width)
      containerEl.setAttribute('data-breakpoint', type)
      notifyListeners(type)
    })

    observer.observe(containerEl)

    // Now notify listeners after observer is set up
    notifyListeners(initialType)

    cleanup = () => {
      observer.disconnect()
      containerEl.style.containerType = ''
      containerEl.removeAttribute('data-breakpoint')
    }
  } else {
    // Viewport-based fallback
    const mq = {
      mobile: window.matchMedia(`(max-width: ${maxMobileWidth}px)`),
      desktop: window.matchMedia(`(min-width: ${minDesktopWidth}px)`)
    }

    const detect = () => {
      let type

      if (mq.mobile.matches) {
        type = 'mobile'
      } else if (mq.desktop.matches) {
        type = 'desktop'
      } else {
        type = 'tablet'
      }

      notifyListeners(type)
    }

    mq.mobile.addEventListener('change', detect)
    mq.desktop.addEventListener('change', detect)
    detect()

    cleanup = () => {
      mq.mobile.removeEventListener('change', detect)
      mq.desktop.removeEventListener('change', detect)
    }
  }

  const subscribe = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  const getBreakpoint = () => {
    return lastBreakpoint === 'unknown' ? 'desktop' : lastBreakpoint
  }

  const destroy = () => {
    cleanup?.()
    listeners.clear()
  }

  return {
    subscribe,
    getBreakpoint,
    destroy
  }
}

export { createBreakpointDetector }
