/**
 * Generic reducer action that shallow-merges the payload into state.
 * Shared by MAP_MOVE, MAP_MOVE_END and MAP_FIRST_IDLE.
 */
const mergePayload = (state, payload) => ({
  ...state,
  ...payload
})

const setMapReady = (state, mapProvider) => {
  return {
    ...state,
    isMapReady: true,
    mapProvider
  }
}

const setMapStyle = (state, payload) => {
  return {
    ...state,
    mapStyle: payload
  }
}

const setMapSize = (state, payload) => {
  return {
    ...state,
    mapSize: payload
  }
}

const updateCrossHair = (state, payload) => {
  return {
    ...state,
    crossHair: {
      ...state.crossHair,
      ...payload
    }
  }
}

const upsertMarker = (state, payload) => {
  const map = new Map(state.markers.items.map(item => [item.id, item]))
  map.set(payload.id, payload)
  const newItems = Array.from(map.values())

  return {
    ...state,
    markers: {
      ...state.markers,
      items: newItems
    }
  }
}

const removeMarker = (state, payload) => {
  const newItems = state.markers.items.filter(item => item.id !== payload)

  return {
    ...state,
    markers: {
      ...state.markers,
      items: newItems
    }
  }
}

export const actionsMap = {
  SET_MAP_READY: setMapReady,
  MAP_MOVE: mergePayload,
  MAP_MOVE_END: mergePayload,
  MAP_FIRST_IDLE: mergePayload,
  SET_MAP_STYLE: setMapStyle,
  SET_MAP_SIZE: setMapSize,
  UPDATE_CROSS_HAIR: updateCrossHair,
  UPSERT_LOCATION_MARKER: upsertMarker,
  REMOVE_LOCATION_MARKER: removeMarker
}
