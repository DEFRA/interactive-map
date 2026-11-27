// The entry for the openlayers engine package, used in place of ../index.js (see engines.mjs)
import createOpenLayersProvider from '../../providers/openlayers/src/index.js'
import { createEngineMap } from './createEngineMap.js'

const InteractiveMap = createEngineMap(createOpenLayersProvider)

export default InteractiveMap
export { InteractiveMap }
export { EVENTS } from '../config/events.js'
