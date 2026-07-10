import { splitPolygon } from '../utils/spatial.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'

const INVALID_REASON = 'Line does not split the shape into two parts'

// Recompute split validity and re-apply the same gate normal draw/edit uses:
// disables Done (manifest.js enableWhen reads pluginState.geometryValid) and blocks
// the double-click/click-vertex finish gesture (drawMode/clickHandlers.js reads
// map._drawGeometryValid) while the line wouldn't produce a valid split. Only uses
// the shared, engine-agnostic adapter interface — no mapbox-gl-draw internals.
const applySplitValidity = ({ draw, dispatch, polygonFeature, feature }) => {
  const lineFeature = { id: '_splitter', geometry: feature.geometry }
  const featureCollection = splitPolygon(polygonFeature, lineFeature)
  const isValid = !!featureCollection
  // The splitter line has no stable id until it's actually created, so the
  // in-progress preview colour is tagged via setDrawingPreviewProperty, not
  // setFeatureProperty (that targets the '_splitter' id assigned on completion —
  // see onSplitCreate below).
  draw.setDrawingPreviewProperty('splitter', isValid ? 'valid' : 'invalid')
  dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid } })
  dispatch({ type: 'SET_GEOMETRY_VALID', payload: isValid })
  draw.setGeometryValid(isValid)
  return isValid ? { valid: true } : { valid: false, reason: INVALID_REASON }
}

// Installed as draw._geometryValidator so the normal validation pipeline drives
// split's validity too. Skip 'place' and 'create': the line isn't a full split until
// its last vertex, so checking those would block placement and hijack an early
// finish into edit mode. Only check on the live preview and each committed vertex.
const createSplitValidator = ({ draw, dispatch, polygonFeature }) => (feature, context) => {
  const isSoftCheck = context.phase === 'preview' || context.phase?.startsWith('commit-')
  if (!isSoftCheck) {
    return { valid: true }
  }
  return applySplitValidity({ draw, dispatch, polygonFeature, feature })
}

/**
 * Start drawing a split line for a polygon.
 *
 * Only fully implemented for MapLibre. For OpenLayers the geometry calculation
 * will run but real-time preview (geometrychange) and snap-to-outline are not
 * wired up — coordinate-system differences mean results may be incorrect too.
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

  // Swap in split's own rule for the splitter-line session; restored in
  // stopListening so the polygon's own developer-supplied validator isn't left
  // permanently replaced once the split session ends.
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
    featureId: '_splitter',
    properties: { splitter: 'invalid' }
  })

  // Scoped to this one splitter-line session — leaving either registered past
  // that would leak into whatever the user draws or edits next.
  const stopListening = () => {
    draw._geometryValidator = previousValidator
    draw.off(ADAPTER_EVENTS.CREATE, onSplitCreate)
    draw.off(ADAPTER_EVENTS.CANCEL, onSplitCancel)
  }

  // One-shot: compute split result once the line is finalised
  const onSplitCreate = (geojsonFeature) => {
    stopListening()
    const featureCollection = splitPolygon(polygonFeature, geojsonFeature)

    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid: !!featureCollection } })

    if (featureCollection) {
      eventBus.emit('draw:split', {
        originalFeatureId: featureId,
        featureCollection
      })
    }
  }

  // The splitter line was abandoned (e.g. Escape) — nothing to compute, just stop listening.
  const onSplitCancel = () => {
    stopListening()
  }

  draw.on(ADAPTER_EVENTS.CREATE, onSplitCreate)
  draw.on(ADAPTER_EVENTS.CANCEL, onSplitCancel)

  dispatch({ type: 'SET_MODE', payload: 'draw_line' })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' } })
}
