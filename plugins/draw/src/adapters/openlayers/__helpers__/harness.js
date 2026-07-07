import Feature from 'ol/Feature.js'
import Polygon from 'ol/geom/Polygon.js'
import LineString from 'ol/geom/LineString.js'
import Style from 'ol/style/Style.js'
import { createUndoStack } from '../../../utils/undoStack.js'

/**
 * Shared test doubles for the OL adapter. The fake map uses an identity
 * mapping between map coordinates and screen pixels so hit-test assertions
 * read naturally: a vertex at [10, 20] sits at pixel (10, 20).
 */

export const createEmitter = () => {
  const listeners = {}
  return {
    on: jest.fn((type, h) => { (listeners[type] ??= []).push(h) }),
    un: jest.fn((type, h) => { listeners[type] = (listeners[type] ?? []).filter(x => x !== h) }),
    once: jest.fn((type, h) => { (listeners[`once:${type}`] ??= []).push(h) }),
    emit (type, e) {
      (listeners[type] ?? []).forEach(h => h(e));
      (listeners[`once:${type}`] ?? []).splice(0).forEach(h => h(e))
    }
  }
}

export const createFakeMap = ({ center = [50, 50] } = {}) => {
  const emitter = createEmitter()
  const viewport = document.createElement('div')
  document.body.appendChild(viewport)
  const view = { ...createEmitter(), getCenter: () => center, getAnimating: jest.fn(() => false) }
  return {
    ...emitter,
    interactions: [],
    layers: [],
    addInteraction (i) { this.interactions.push(i) },
    removeInteraction: jest.fn(function (i) { this.interactions = this.interactions.filter(x => x !== i) }),
    addLayer (l) { this.layers.push(l) },
    removeLayer: jest.fn(function (l) { this.layers = this.layers.filter(x => x !== l) }),
    getViewport: () => viewport,
    getPixelFromCoordinate: (c) => [c[0], c[1]],
    getCoordinateFromPixel: (p) => [p[0], p[1]],
    getEventPixel: (e) => [e.clientX, e.clientY],
    getView: () => view,
    render: jest.fn()
  }
}

// Manager double matching the OLDrawManager surface EditMode/DrawMode consume
export const createFakeManager = () => {
  const bus = createEmitter()
  return {
    on: bus.on,
    off: bus.un,
    emit: jest.fn(bus.emit),
    // Real Style instances — OL asserts on setStyle args; identify them by reference
    styles: {
      editFeatureStyle: new Style({}),
      editFeatureStyleInvalid: new Style({}),
      vertexStyle: new Style({}),
      midpointStyle: new Style({}),
      selectedVertexStyle: new Style({}),
      selectedMidpointStyle: new Style({}),
      createSketchStyle: jest.fn(() => () => [])
    },
    colors: { editVertex: 'rgba(29,112,184,1)' },
    undoStack: createUndoStack(() => {})
  }
}

export const polygonFeature = (ring, id = 'f1') => {
  const feature = new Feature(new Polygon([ring]))
  feature.setId(id)
  return feature
}

export const lineFeature = (coords, id = 'f1') => {
  const feature = new Feature(new LineString(coords))
  feature.setId(id)
  return feature
}

export const createContainer = () => {
  const container = document.createElement('div')
  container.tabIndex = 0
  document.body.appendChild(container)
  return container
}

// jsdom has no PointerEvent/TouchEvent constructors — build plain events with the fields the handlers read
export const domEvent = (type, props) => Object.assign(new Event(type, { bubbles: true }), props)
