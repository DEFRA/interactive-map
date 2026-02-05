import { getSnapInstance } from '../utils/snapHelpers.js'
import { splitPolygon } from '../utils/spatial.js'
import { debounce } from '../utils/debounce.js'

/**
 * Programmatically split a polygon or line
 * @param {object} context - plugin context
 * @param {string} feature - the new feature to be split
 * @param {object} options - Options including snapLayers.
 */
export const split = ({ appState, appConfig, pluginState, mapProvider }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw, map } = mapProvider

  if (!draw) {
    return
  }

  // Get target polygon feature
  const polygonFeature = draw.get(featureId)

  // Always include 'stroke-inactive' in snap layers
  const snapLayers = ['stroke-inactive.cold', ...(options.snapLayers || [])]

  // Set per-call snap layers if provided
  const snap = getSnapInstance(map)

  if (snap?.setSnapLayers) {
    snap.setSnapLayers(snapLayers)
  } else if (options.snapLayers) {
    // Snap instance not ready yet - store for later
    map._pendingSnapLayers = snapLayers
  } else {
    // No action
  }

  // Update state so UI can react to snap layer availability
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: true })

  // Change mode to draw_line
  draw.changeMode('draw_line', {
    container: appState.layoutRefs.viewportRef.current,
    vertexMarkerId: `${appConfig.id}-cross-hair`,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    getSnapEnabled: () => mapProvider.snapEnabled === true,
    featureId: '_splitter',
    properties: { splitter: 'invalid' }
  })

  // Perform split
  map.on('draw.create', (e) => {
    const lineFeature = e.features[0]
    const featureCollection = splitPolygon(polygonFeature, lineFeature)
    draw.setFeatureProperty('_splitter', 'splitter', featureCollection ? 'valid' : 'invalid')
    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid: !!featureCollection }})
  })

  // Real time check for valid line
  const DEBOUNCE_SPLIT_POLYGON = 50
  const onGeometryChange = debounce((e) => {
    if (e.coordinates.length < 2) {
      return
    }
    const lineFeature = { id: '_splitter', geometry: { type: 'LineString', coordinates: e.coordinates }}
    const featureCollection = splitPolygon(polygonFeature, lineFeature)
    const isValid = !!featureCollection
    e.properties.splitter = isValid ? 'valid' : 'invalid'
    e.ctx.store.render()
    if (draw.getMode() === 'edit_vertex') {
      dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid }})
    }
  }, DEBOUNCE_SPLIT_POLYGON)
  map.on('draw.geometrychange', onGeometryChange)

  // Set mode to 'draw_line'
  dispatch({ type: 'SET_MODE', payload: 'draw_line' })

  // Set action to 'split'
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' }})
}
