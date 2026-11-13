// The entry for the maplibre engine package, used in place of ../index.js (see engines.mjs)
import createMapLibreProvider from '../../providers/maplibre/src/index.js'
import { createEngineMap } from './createEngineMap.js'

const InteractiveMap = createEngineMap(createMapLibreProvider)

export default InteractiveMap
export { InteractiveMap }
export { EVENTS } from '../config/events.js'
