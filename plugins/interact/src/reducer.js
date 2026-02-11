const initialState = {
  enabled: false,
  dataLayers: [],
  markerColor: null,
  interactionMode: null,
  multiSelect: false,
  contiguous: false,
  selectedFeatures: [],
  selectionBounds: null,
  closeOnAction: true // Done or Cancel
}

const enable = (state, payload) => {
  return {
    ...state,
    ...payload,
    enabled: true
  }
}

const disable = (state) => {
  return {
    ...state,
    enabled: false,
    selectedFeatures: [],
    selectionBounds: null
  }
}

/**
 * Toggle a feature in the selectedFeatures Set.
 * Structure of items in Set: { featureId: string, layerId: string, idProperty: string }
 */
const toggleSelectedFeatures = (state, payload) => {
  const { featureId, multiSelect, layerId, idProperty, addToExisting = true, replaceAll = false, properties, geometry } = payload
  const currentSelected = Array.isArray(state.selectedFeatures) ? state.selectedFeatures : []
  
  const existingIndex = currentSelected.findIndex(
    f => f.featureId === featureId && f.layerId === layerId
  )

  // 1. Handle explicit unselect
  if (addToExisting === false) {
    const filtered = currentSelected.filter((_, i) => i !== existingIndex)
    return { ...state, selectedFeatures: filtered, selectionBounds: null }
  }

  // Define the feature object once to avoid repetition
  const featureObj = { featureId, layerId, idProperty, properties, geometry }
  let nextSelected

  // 2. Determine New State 
  // We combine 'replaceAll' and 'single-select' because they share the same logic
  if (multiSelect && !replaceAll) {
    const selectedCopy = [...currentSelected]
    if (existingIndex === -1) {
      selectedCopy.push(featureObj)
    } else {
      selectedCopy.splice(existingIndex, 1)
    }
    nextSelected = selectedCopy
  } else {
    // Both 'replaceAll' and single-select mode logic:
    // If same feature is already the only one, toggle off; otherwise return just this feature.
    const isSameSingle = existingIndex !== -1 && currentSelected.length === 1
    nextSelected = isSameSingle ? [] : [featureObj]
  }

  return { ...state, selectedFeatures: nextSelected, selectionBounds: null }
}

// Update bounds (called from useEffect after map provider calculates them)
const updateSelectedBounds = (state, payload) => {
  if (JSON.stringify(payload) === JSON.stringify(state.selectionBounds)) {
    return state
  }
  return {
    ...state,
    selectionBounds: payload
  }
}

const clearSelectedFeatures = (state) => {
  return {
    ...state,
    selectedFeatures: [],
    selectionBounds: null
  }
}

const actions = {
  ENABLE: enable,
  DISABLE: disable,
  TOGGLE_SELECTED_FEATURES: toggleSelectedFeatures,
  UPDATE_SELECTED_BOUNDS: updateSelectedBounds,
  CLEAR_SELECTED_FEATURES: clearSelectedFeatures
}

export {
  initialState,
  actions
}