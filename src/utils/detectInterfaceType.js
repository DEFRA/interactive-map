let lastInterfaceType = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'unknown'
const interfaceTypeListeners = new Set()

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
    interfaceTypeListeners.forEach((listener) => {
      listener(newType)
    })
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

function createInterfaceDetector () {
  const mql = window.matchMedia('(pointer: coarse)')

  // handle DevTools / system pointer type changes
  const handleMediaChange = e => {
    notifyListeners(e.matches ? 'touch' : 'mouse')
  }

  mql.addEventListener('change', handleMediaChange)

  const REACT_CLICK_DELAY = 150

  const handlePointer = event => {
    const type = normalizePointerType(event.pointerType)
    setTimeout(() => notifyListeners(type), REACT_CLICK_DELAY)
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

export {
  createInterfaceDetector,
  getInterfaceType,
  subscribeToInterfaceChanges
}
