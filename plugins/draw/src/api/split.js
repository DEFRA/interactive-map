import { splitPolygon } from '../utils/spatial.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'

const INVALID_REASON = 'Line does not split the shape into two parts'
const MIN_LINE_VERTICES = 2
const SPLITTER_ID = '_splitter'

const computeIsValid = (polygonFeature, feature) => {
  const coordinates = feature.geometry?.coordinates
  if (!coordinates || coordinates.length < MIN_LINE_VERTICES) {
    return false
  }
  return !!splitPolygon(polygonFeature, { id: SPLITTER_ID, geometry: feature.geometry })
}

// Colours the splitter line preview. Uses setDrawingPreviewProperty rather than
// setFeatureProperty since the line has no stable id until it's created.
const applySplitPreview = ({ draw, polygonFeature, feature }) => {
  const isValid = computeIsValid(polygonFeature, feature)
  draw.setDrawingPreviewProperty('splitter', isValid ? 'valid' : 'invalid')
  // DEBUG
  console.log('[split] preview', { coords: feature.geometry?.coordinates, isValid })
  return isValid
}

// Colours the preview and gates Done/the finish gesture for a committed vertex.
const applySplitCommit = ({ draw, dispatch, polygonFeature, feature }) => {
  const isValid = applySplitPreview({ draw, polygonFeature, feature })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid } })
  dispatch({ type: 'SET_GEOMETRY_VALID', payload: isValid })
  draw.setGeometryValid(isValid)
  // DEBUG
  console.log('[split] commit', { coords: feature.geometry?.coordinates, isValid })
  return isValid
}

// Installed as draw._geometryValidator. 'place' and 'create' are no-ops — a split
// isn't complete until its last vertex, so checking those would block placement
// and hijack an early finish into edit mode.
const createSplitValidator = ({ draw, dispatch, polygonFeature }) => (feature, context) => {
  let isValid
  if (context.phase === 'preview') {
    isValid = applySplitPreview({ draw, polygonFeature, feature })
  } else if (context.phase?.startsWith('commit-')) {
    isValid = applySplitCommit({ draw, dispatch, polygonFeature, feature })
  } else {
    return { valid: true }
  }
  return isValid ? { valid: true } : { valid: false, reason: INVALID_REASON }
}

/**
 * Start drawing a split line for a polygon.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - ID of the polygon to split
 * @param {object} options - Options including snapLayers.
 */
export const split = ({ appState, appConfig, pluginState, mapState, mapProvider, services }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  const polygonFeature = draw.get(featureId)

  // Swap in split's own rule; restored in stopListening.
  const previousValidator = draw._geometryValidator
  draw._geometryValidator = createSplitValidator({ draw, dispatch, polygonFeature })

  // Always include the draw outline layer so the split line snaps to it
  const snapLayers = ['stroke-inactive.cold', ...(options.snapLayers || [])]
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: true })

  draw.changeMode('draw_line', {
    container: appState.layoutRefs.viewportRef.current,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    crossHair: mapState?.crossHair,
    getSnapEnabled: () => draw.isSnapEnabled(),
    featureId: SPLITTER_ID,
    properties: { splitter: 'invalid' }
  })

  // Unregister everything scoped to this session.
  const stopListening = () => {
    draw._geometryValidator = previousValidator
    draw.off(ADAPTER_EVENTS.CREATE, onSplitCreate)
    draw.off(ADAPTER_EVENTS.CANCEL, onSplitCancel)
  }

  // Compute split result once the line is finalised. The splitter line only ever
  // exists to compute this — it must never linger in the draw store afterwards.
  const onSplitCreate = (geojsonFeature) => {
    stopListening()
    draw.delete(SPLITTER_ID)
    const featureCollection = splitPolygon(polygonFeature, geojsonFeature)

    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid: !!featureCollection } })

    if (featureCollection) {
      eventBus.emit('draw:split', {
        originalFeatureId: featureId,
        featureCollection
      })
    }
  }

  // Abandoned (e.g. Escape) — just stop listening.
  const onSplitCancel = () => { stopListening() }

  draw.on(ADAPTER_EVENTS.CREATE, onSplitCreate)
  draw.on(ADAPTER_EVENTS.CANCEL, onSplitCancel)

  dispatch({ type: 'SET_MODE', payload: 'draw_line' })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' } })
}
