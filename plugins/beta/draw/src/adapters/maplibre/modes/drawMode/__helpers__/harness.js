import { DrawPolygonMode } from '../../drawPolygonMode.js'
import { DrawLineMode } from '../../drawLineMode.js'
import { createUndoStack } from '../../../../../utils/undoStack.js'
import PolygonFeature from '../../../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/polygon.js'
import LineStringFeature from '../../../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/line_string.js'

/**
 * Shared test harness for the createDrawMode handler modules. Exercises the real
 * DrawPolygonMode / DrawLineMode (real mapbox-gl-draw parent modes and feature
 * classes) over test doubles for the map, store and DOM. Excluded from coverage.
 */

export { DrawPolygonMode, DrawLineMode }
export const CENTER = { lng: 5, lat: 5 }

const createMap = () => {
  const canvas = document.createElement('canvas')
  const listeners = {}
  return {
    _undoInProgress: false,
    _undoStack: null,
    _snapInstance: null,
    doubleClickZoom: { disable: jest.fn(), enable: jest.fn() },
    getCanvas: () => canvas,
    getCenter: () => ({ ...CENTER }),
    project: jest.fn(() => ({ x: 50, y: 50 })),
    unproject: jest.fn(() => ({ ...CENTER })),
    fire: jest.fn(function (type, e) { (listeners[type] ?? []).forEach((h) => h(e)) }),
    on: jest.fn((type, h) => { (listeners[type] ??= []).push(h) }),
    off: jest.fn((type, h) => { listeners[type] = (listeners[type] ?? []).filter((x) => x !== h) })
  }
}

// The `this` context mapbox-gl-draw gives a mode: map, ctx accessors and the mode's own methods
const createModeContext = (mode) => {
  const map = createMap()
  const features = new Map()
  const store = {
    add: jest.fn((f) => features.set(f.id, f)),
    delete: jest.fn((ids) => ids.forEach((id) => features.delete(id))),
    render: jest.fn(),
    featureChanged: jest.fn(),
    getInitialConfigValue: jest.fn(() => true)
  }
  const ctx = {
    map,
    _ctx: { store, api: { changeMode: jest.fn(), add: jest.fn(), delete: jest.fn() }, options: {} },
    addFeature: (f) => store.add(f),
    getFeature: (id) => features.get(id),
    deleteFeature: jest.fn((ids) => ids.forEach((id) => features.delete(id))),
    clearSelectedFeatures: jest.fn(),
    updateUIClasses: jest.fn(),
    activateUIButton: jest.fn(),
    setActionableState: jest.fn(),
    changeMode: jest.fn()
  }
  ctx.newFeature = (geojson) => geojson.geometry.type === 'Polygon'
    ? new PolygonFeature(ctx._ctx, geojson)
    : new LineStringFeature(ctx._ctx, geojson)
  Object.assign(ctx, mode)
  contexts.push(ctx)
  return ctx
}

// Remove window/container/map listeners registered by onSetup so tests don't leak into each other
const contexts = []
const removeListeners = (ctx) => ctx._listeners?.forEach(([t, e, h]) =>
  t.removeEventListener ? t.removeEventListener(e, h) : t.off(e, h))

const createContainer = () => {
  const container = document.createElement('div')
  container.tabIndex = 0
  const marker = document.createElement('div')
  marker.id = 'vertex-marker'
  container.appendChild(marker)
  const button = document.createElement('button')
  button.id = 'add-vertex'
  container.appendChild(button)
  document.body.appendChild(container)
  return { container, marker, button }
}

export const setup = (mode, options = {}) => {
  const ctx = createModeContext(mode)
  const dom = createContainer()
  ctx.map._undoStack = createUndoStack(() => {})
  const state = ctx.onSetup({
    container: dom.container,
    vertexMarkerId: 'vertex-marker',
    addVertexButtonId: 'add-vertex',
    interfaceType: 'mouse',
    featureId: 'shape-1',
    properties: { label: 'field' },
    ...options
  })
  return { ctx, state, ...dom }
}

export const clickEvent = (ctx, lng, lat, overrides = {}) => ({
  lngLat: { lng, lat },
  point: { x: lng, y: lat },
  originalEvent: { button: 0, target: ctx.map.getCanvas(), ...overrides }
})

export const clickAt = (ctx, state, lng, lat) => ctx.onClick(state, clickEvent(ctx, lng, lat))

export const firedWith = (map, type) => map.fire.mock.calls.filter(([t]) => t === type).map(([, e]) => e)

export const activeSnap = () => ({ status: true, snapStatus: true, snapCoords: [9, 9], snapToClosestPoint: jest.fn() })

afterEach(() => {
  contexts.splice(0).forEach(removeListeners)
  document.body.innerHTML = ''
  jest.useRealTimers()
})
