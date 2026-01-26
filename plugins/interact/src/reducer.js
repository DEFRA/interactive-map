const initialState = {
  enabled: false,
  selectedFeatures: [],
  selectionBounds: null
}

const setEnabled = (state, payload) => {
  return {
    ...state,
    enabled: payload
  }
}

/**
 * Toggle a feature in the selectedFeatures Set.
 * Structure of items in Set: { featureId: string, layerId: string, idProperty: string }
 */
const toggleSelectedFeatures = (state, payload) => {
  const { featureId, multiSelect, layerId, idProperty, addToExisting = true, properties, geometry } = payload
  const selected = Array.isArray(state.selectedFeatures) ? [...state.selectedFeatures] : []

  const existingIndex = selected.findIndex(
    f => f.featureId === featureId && f.layerId === layerId
  )

  // Handle explicit unselect
  if (addToExisting === false) {
    if (existingIndex !== -1) {
      selected.splice(existingIndex, 1) // remove the feature
    }
    return { ...state, selectedFeatures: selected }
  }

  // Multi-select mode (add to selection)
  if (multiSelect) {
    if (existingIndex === -1) {
      selected.push({ featureId, layerId, idProperty, properties, geometry })
    } else {
      // optional: could also remove existing on toggle
      selected.splice(existingIndex, 1)
    }
    return { ...state, selectedFeatures: selected }
  }

  // Single-select mode
  const isSameSingle = existingIndex !== -1 && selected.length === 1
  const newSelected = isSameSingle ? [] : [{ featureId, layerId, idProperty, properties, geometry }]

  return { ...state, selectedFeatures: newSelected }
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
  SET_ENABLED: setEnabled,
  TOGGLE_SELECTED_FEATURES: toggleSelectedFeatures,
  UPDATE_SELECTED_BOUNDS: updateSelectedBounds,
  CLEAR_SELECTED_FEATURES: clearSelectedFeatures
}

export {
  initialState,
  actions
}