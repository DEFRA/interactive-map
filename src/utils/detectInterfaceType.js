let lastInterfaceType = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'unknown'
const interfaceTypeListeners = new Set()
const interfaceTypeImmediateListeners = new Set()

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

function normalizePointerType (pointerType) {
  if (pointerType === 'pen' || pointerType === 'touch') {
    return 'touch'
  }

  if (pointerType === 'mouse') {
    return 'mouse'
  }

  return 'unknown'
}

function notifyListeners (newType) {
  if (lastInterfaceType !== newType) {
    lastInterfaceType = newType
    interfaceTypeImmediateListeners.forEach(listener => listener(newType))
    interfaceTypeListeners.forEach(listener => listener(newType))
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

function createInterfaceDetector () {
  const mql = window.matchMedia('(pointer: coarse)')

  // System pointer type changes
  const handleMediaChange = e => {
    notifyListeners(e.matches ? 'touch' : 'mouse')
  }

  mql.addEventListener('change', handleMediaChange)

  const REACT_CLICK_DELAY = 150

  const handlePointer = event => {
    const type = normalizePointerType(event.pointerType)
    if (type === lastInterfaceType) {
      return
    }
    // Update synchronously so getInterfaceType() returns the new value immediately —
    // this prevents focusin handlers from seeing the stale 'keyboard' type during a
    // pointer-triggered focus move. Listeners (React state) are still notified async
    // to avoid layout thrashing during the click event.
    lastInterfaceType = type
    interfaceTypeImmediateListeners.forEach(listener => listener(type))
    setTimeout(() => {
      interfaceTypeListeners.forEach(listener => listener(type))
    }, REACT_CLICK_DELAY)
  }

  const handleKeyDown = e => {
    if (e.key === 'Tab') {
      notifyListeners('keyboard')
    }
  }

  window.addEventListener('pointerdown', handlePointer, { passive: true })
  window.addEventListener('keydown', handleKeyDown, { passive: true })

  // cleanup
  return () => {
    mql.removeEventListener('change', handleMediaChange)
    window.removeEventListener('pointerdown', handlePointer)
    window.removeEventListener('keydown', handleKeyDown)
  }
}

function getInterfaceType () {
  if (lastInterfaceType === 'unknown') {
    lastInterfaceType = 'mouse'
    return 'mouse'
  }

  return lastInterfaceType
}

function subscribeToInterfaceChanges (onInterfaceTypeChange) {
  interfaceTypeListeners.add(onInterfaceTypeChange)

  return () => {
    interfaceTypeListeners.delete(onInterfaceTypeChange)
  }
}

// Fires synchronously within the same event cycle — use for direct DOM updates
// that need to be in sync with the pointer event (no 150ms React delay).
function subscribeToInterfaceChangesImmediate (onInterfaceTypeChange) {
  interfaceTypeImmediateListeners.add(onInterfaceTypeChange)

  return () => {
    interfaceTypeImmediateListeners.delete(onInterfaceTypeChange)
  }
}

export {
  createInterfaceDetector,
  getInterfaceType,
  subscribeToInterfaceChanges,
  subscribeToInterfaceChangesImmediate
}
