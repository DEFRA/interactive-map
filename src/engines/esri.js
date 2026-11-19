// The entry for the esri engine package, used in place of ../index.js (see engines.mjs)
import createEsriProvider from '../../providers/esri/src/index.js'
import { createEngineMap } from './createEngineMap.js'

const InteractiveMap = createEngineMap(createEsriProvider)

export default InteractiveMap
export { InteractiveMap }
export { EVENTS } from '../config/events.js'
