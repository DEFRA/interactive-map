import { splitPolygon } from '../utils/spatial.js'
import { debounce } from '../utils/debounce.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'

const DEBOUNCE_MS = 10

// Recompute split validity and re-apply the same gate normal draw/edit uses:
// disables Done (manifest.js enableWhen reads pluginState.geometryValid) and blocks
// the double-click/click-vertex finish gesture (drawMode/clickHandlers.js reads
// map._drawGeometryValid) while the line wouldn't produce a valid split. Only uses
// the shared, engine-agnostic adapter interface — no mapbox-gl-draw internals.
const applySplitValidity = ({ draw, dispatch, polygonFeature, coordinates }) => {
  const lineFeature = { id: '_splitter', geometry: { type: 'LineString', coordinates } }
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
}

// Real-time preview + completion gate as the splitter line is drawn (ML only —
// setFeatureProperty is a no-op on the OL adapter, per its documented interface).
//
// events.js's shared onGeometryChange handler also reacts to every commit-level
// (kind-ful) geometrychange event and — since split nulls out the user validator
// (see split() below) — always marks it valid via the default rules, clobbering
// split's own gate. DrawInit's effect re-attaches that shared handler on every
// pluginState change (detach+reattach reorders the event bus's listener Set), so
// which handler runs first for a given event isn't stable — this can't rely on
// registration order to "win". Instead the correction is deferred one more tick:
// whatever events.js did already ran synchronously by the time this fires, so
// this is always the final word regardless of ordering.
const createGeometryChangeHandler = ({ draw, dispatch, polygonFeature, isStopped }) => {
  const apply = (coordinates) => applySplitValidity({ draw, dispatch, polygonFeature, coordinates })
  const debouncedPreview = debounce(apply, DEBOUNCE_MS)

  return (e) => {
    if (e?.kind) {
      debouncedPreview.cancel?.()
      // Commit-level events carry { feature, kind, vertexIndex } per the shared
      // adapter contract (adapterEvents.js) rather than a top-level coordinates.
      const coordinates = e.feature?.geometry?.coordinates
      if (!coordinates || coordinates.length < 2) {
        return
      }
      setTimeout(() => {
        if (isStopped()) { return }
        apply(coordinates)
      }, 0)
      return
    }
    if (!e.coordinates || e.coordinates.length < 2) {
      return
    }
    debouncedPreview(e.coordinates)
  }
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

  // Split draws its own throwaway line; user geometry validation must not apply here.
  draw._geometryValidator = null

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

  // Both listeners are scoped to this one splitter-line session — leaving either
  // registered past that would leak into whatever the user draws or edits next.
  // Also guards the deferred correction in createGeometryChangeHandler: once true,
  // a stale setTimeout callback from a since-ended session must not touch shared state.
  let stopped = false
  const stopListening = () => {
    stopped = true
    draw.off(ADAPTER_EVENTS.CREATE, onSplitCreate)
    draw.off(ADAPTER_EVENTS.CANCEL, onSplitCancel)
    draw.off(ADAPTER_EVENTS.GEOMETRY_CHANGE, onGeometryChange)
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

  const onGeometryChange = createGeometryChangeHandler({ draw, dispatch, polygonFeature, isStopped: () => stopped })
  draw.on(ADAPTER_EVENTS.GEOMETRY_CHANGE, onGeometryChange)

  dispatch({ type: 'SET_MODE', payload: 'draw_line' })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' } })
}
