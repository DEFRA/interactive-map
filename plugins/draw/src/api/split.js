import { splitPolygon } from '../utils/spatial.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'
import { getCommitChecks } from '../validation/commitChecks.js'

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
  return isValid
}

// Colours the preview for a committed vertex and records whether the split is valid.
// Its returned verdict gates Done and the finish gesture (events.js).
const applySplitCommit = ({ draw, dispatch, polygonFeature, feature }) => {
  const isValid = applySplitPreview({ draw, polygonFeature, feature })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid } })
  return isValid
}

const toResult = (isValid) => (isValid ? { valid: true } : { valid: false, reason: INVALID_REASON })

// Installed as draw._previewValidator. 'place' is a no-op — a split isn't complete
// until its last vertex, so checking it would block placement.
const createSplitPreviewValidator = ({ draw, polygonFeature }) => ({ feature, phase }) =>
  phase === 'preview' ? toResult(applySplitPreview({ draw, polygonFeature, feature })) : { valid: true }

// Installed as draw._commitValidator. 'create' is a no-op — checking it would
// hijack an early finish into edit mode.
const createSplitCommitValidator = ({ draw, dispatch, polygonFeature }) => ({ feature, phase }) =>
  phase?.startsWith('commit-') ? toResult(applySplitCommit({ draw, dispatch, polygonFeature, feature })) : { valid: true }

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

  // Swap in split's own rules; restored in stopListening.
  const previousPreviewValidator = draw._previewValidator
  const previousValidator = draw._commitValidator
  draw._previewValidator = createSplitPreviewValidator({ draw, polygonFeature })
  draw._commitValidator = createSplitCommitValidator({ draw, dispatch, polygonFeature })
  getCommitChecks(draw).reset()

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
    draw._previewValidator = previousPreviewValidator
    draw._commitValidator = previousValidator
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
