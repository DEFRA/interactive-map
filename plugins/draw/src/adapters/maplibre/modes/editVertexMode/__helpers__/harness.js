import { EditVertexMode } from '../../editVertexMode.js'
import { createUndoStack } from '../../../../../utils/undoStack.js'
import PolygonFeature from '../../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/polygon.js'
import LineStringFeature from '../../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/line_string.js'

/**
 * Shared test harness for the vertex-edit mode and its handler modules. Builds the real
 * EditVertexMode (with the real DirectSelect parent and real mapbox-gl-draw feature
 * classes) over test doubles for the map, store, api and DOM. Excluded from coverage.
 */

// Deterministic projection: lngLat <-> pixel is a x10 scale.
const project = (p) => {
  const [lng, lat] = Array.isArray(p) ? p : [p.lng, p.lat]
  return { x: lng * 10, y: lat * 10 }
}
const unproject = ({ x, y }) => ({ lng: x / 10, lat: y / 10 })

export const POLYGON = () => ({ type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] })
export const LINE = () => ({ type: 'LineString', coordinates: [[0, 0], [10, 0], [10, 10]] })
export const dragEvt = (lng, lat) => ({ originalEvent: { stopPropagation: jest.fn() }, lngLat: { lng, lat }, point: { x: lng * 10, y: lat * 10 } })
export const svgTarget = (state) => ({ parentNode: state.touchVertexTarget })

const contexts = []

export const createHarness = (geometry = POLYGON(), setupOptions = {}) => {
  const features = new Map()
  const store = {
    featureChanged: jest.fn(),
    render: jest.fn(),
    get: (id) => features.get(id)
  }
  const api = {
    add: jest.fn((geojson) => {
      const FeatureClass = geojson.geometry.type === 'Polygon' ? PolygonFeature : LineStringFeature
      // Mirror Draw.add: re-create the feature so Polygon closing coords are normalised
      features.set(geojson.id, new FeatureClass(_ctx, { ...geojson, id: geojson.id }))
      return [geojson.id]
    }),
    changeMode: jest.fn(),
    delete: jest.fn(),
    trash: jest.fn()
  }
  const _ctx = { store, api, options: {} }

  const FeatureClass = geometry.type === 'Polygon' ? PolygonFeature : LineStringFeature
  const feature = new FeatureClass(_ctx, { type: 'Feature', id: 'feat-1', properties: {}, geometry })
  features.set('feat-1', feature)

  const listeners = {}
  const map = {
    _undoStack: createUndoStack(() => {}),
    _snapInstance: null,
    _lastEditFeatureId: null,
    _drawEditContainer: null,
    _editingFeatureId: null,
    _drawCurrentMapStyle: { mapColorScheme: 'light' },
    dragPan: { enable: jest.fn(), disable: jest.fn(), isEnabled: () => true },
    doubleClickZoom: { enable: jest.fn(), disable: jest.fn() },
    getSource: jest.fn(() => ({ setData: jest.fn() })),
    getLayer: jest.fn(() => null),
    setLayoutProperty: jest.fn(),
    getCenter: () => ({ lng: 5, lat: 5 }),
    project: jest.fn(project),
    unproject: jest.fn(unproject),
    fire: jest.fn(function (type, e) { (listeners[type] ?? []).forEach((h) => h(e)) }),
    on: jest.fn((type, h) => { (listeners[type] ??= []).push(h) }),
    off: jest.fn((type, h) => { listeners[type] = (listeners[type] ?? []).filter((x) => x !== h) })
  }

  const container = document.createElement('div')
  container.tabIndex = 0
  document.body.appendChild(container)

  const ctx = {
    map,
    _ctx,
    getFeature: (id) => features.get(id),
    getSelected: jest.fn(() => [feature]),
    setSelected: jest.fn(),
    setSelectedCoordinates: jest.fn(),
    clearSelectedCoordinates: jest.fn(),
    setActionableState: jest.fn(),
    updateUIClasses: jest.fn(),
    fire: jest.fn()
  }
  Object.assign(ctx, EditVertexMode)

  const options = {
    container,
    featureId: 'feat-1',
    interfaceType: 'mouse',
    deleteVertexButtonId: 'delete-vertex',
    undoButtonId: 'undo-vertex',
    isPanEnabled: true,
    ...setupOptions
  }
  const state = ctx.onSetup(options)
  contexts.push({ ctx, state })
  return { ctx, state, feature, features, map, store, api, container, options }
}

afterEach(() => {
  contexts.splice(0).forEach(({ ctx, state }) => { try { ctx.onStop(state) } catch { /* already stopped */ } })
  document.body.innerHTML = ''
  jest.useRealTimers()
})
