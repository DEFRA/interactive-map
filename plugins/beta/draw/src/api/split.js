import { splitPolygon } from '../utils/spatial.js'
import { debounce } from '../utils/debounce.js'

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
export const split = ({ appState, appConfig, pluginState, mapState, mapProvider }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider

  if (!draw) {
    return
  }

  const polygonFeature = draw.get(featureId)

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

  // One-shot: compute split result once the line is finalised
  const onSplitCreate = (geojsonFeature) => {
    draw.off('create', onSplitCreate)
    const featureCollection = splitPolygon(polygonFeature, geojsonFeature)
    draw.setFeatureProperty('_splitter', 'splitter', featureCollection ? 'valid' : 'invalid')
    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid: !!featureCollection } })
  }
  draw.on('create', onSplitCreate)

  // Real-time preview: update split validity as vertices are placed (ML only)
  const DEBOUNCE_MS = 50
  const onGeometryChange = debounce((e) => {
    if (e.coordinates.length < 2) {
      return
    }
    const lineFeature = { id: '_splitter', geometry: { type: 'LineString', coordinates: e.coordinates } }
    const featureCollection = splitPolygon(polygonFeature, lineFeature)
    const isValid = !!featureCollection
    e.properties.splitter = isValid ? 'valid' : 'invalid'
    e.ctx?.store?.render()
    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid } })
  }, DEBOUNCE_MS)
  draw.on('geometrychange', onGeometryChange)

  dispatch({ type: 'SET_MODE', payload: 'draw_line' })
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' } })
}
