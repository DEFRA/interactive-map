import { updateMap } from './updateMap.js'
import { RESULT_MESSAGE } from '../defaults.js'

// Moves focus to the map with the result message, moves the map to the result and emits the match
export const showResult = ({ suggestion, query, services, mapProvider, markers, showMarker, markerOptions }) => {
  services.focusMap({ message: RESULT_MESSAGE.replace('{query}', query) })
  updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerOptions })
  services.eventBus.emit('search:match', { query, ...suggestion })
}
