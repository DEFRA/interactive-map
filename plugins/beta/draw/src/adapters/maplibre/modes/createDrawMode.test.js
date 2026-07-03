import { DrawPolygonMode } from './drawPolygonMode.js'
import { DrawLineMode } from './drawLineMode.js'
import { createUndoStack } from '../../../utils/undoStack.js'
import PolygonFeature from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/polygon.js'
import LineStringFeature from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/line_string.js'

/**
 * Behaviour tests for the shared draw mode factory, exercised through the real
 * DrawPolygonMode / DrawLineMode objects with real mapbox-gl-draw parent modes
 * and feature classes. Only the map, store and DOM are test doubles.
 */

const CENTER = { lng: 5, lat: 5 }

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

const setup = (mode, options = {}) => {
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

const clickEvent = (ctx, lng, lat, overrides = {}) => ({
  lngLat: { lng, lat },
  point: { x: lng, y: lat },
  originalEvent: { button: 0, target: ctx.map.getCanvas(), ...overrides }
})

const clickAt = (ctx, state, lng, lat) => ctx.onClick(state, clickEvent(ctx, lng, lat))

const firedWith = (map, type) => map.fire.mock.calls.filter(([t]) => t === type).map(([, e]) => e)

const activeSnap = () => ({ status: true, snapStatus: true, snapCoords: [9, 9], snapToClosestPoint: jest.fn() })

afterEach(() => {
  contexts.splice(0).forEach(removeListeners)
  document.body.innerHTML = ''
  jest.useRealTimers()
})

describe('setup and crosshair', () => {
  test('mouse interface hides the vertex marker, keyboard shows it', () => {
    const mouse = setup(DrawPolygonMode)
    expect(mouse.marker.style.display).toBe('none')

    const keyboard = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    expect(keyboard.marker.style.display).toBe('block')
  })

  test('getInterfaceType() takes precedence over the static interfaceType option', () => {
    const { state, marker } = setup(DrawPolygonMode, { interfaceType: 'mouse', getInterfaceType: () => 'touch' })
    expect(state.interfaceType).toBe('touch')
    expect(marker.style.display).toBe('block')
  })

  test('a crossHair object is used instead of the vertex marker when provided', () => {
    const crossHair = { show: jest.fn(), hide: jest.fn() }
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard', crossHair })
    expect(crossHair.show).toHaveBeenCalled()
    ctx.pointermoveHandler({ pointerType: 'mouse' })
    expect(crossHair.hide).toHaveBeenCalled()
    ctx.onBlur(state, { target: document.body })
    expect(crossHair.hide).toHaveBeenCalledTimes(2)
  })

  test('line mode creates a fresh feature even when featureId is passed', () => {
    const { state } = setup(DrawLineMode)
    expect(state.line).toBeDefined()
    expect(state.featureId).toBe('shape-1')
  })
})

describe('mouse clicks (polygon)', () => {
  test('each click at a new position places a vertex, fires vertexchange and pushes an undo op', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)

    // Ring is [v0, v1, rubber_band]
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    expect(state.polygon.coordinates[0][0]).toEqual([0, 0])
    expect(state.polygon.coordinates[0][1]).toEqual([10, 0])
    expect(firedWith(ctx.map, 'draw.vertexchange').pop()).toEqual({ numVertecies: 2 })
    expect(ctx.map._undoStack.length).toBe(2)
  })

  test('clicking the same position again is rejected', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0]).toHaveLength(2)
    expect(ctx.map._undoStack.length).toBe(1)
  })

  test('non-primary buttons, undo-in-progress and off-canvas clicks are ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.onClick(state, clickEvent(ctx, 0, 0, { button: 2 }))
    ctx.map._undoInProgress = true
    clickAt(ctx, state, 0, 0)
    ctx.map._undoInProgress = false
    ctx.onClick(state, clickEvent(ctx, 0, 0, { target: document.body }))
    expect(state.polygon.coordinates[0]).toHaveLength(0)
  })

  test('with snap active the vertex is placed at the snapped position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    ctx.map._snapInstance = activeSnap()
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0][0]).toEqual([9, 9])
  })

  test('onTap is disabled', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    expect(ctx.onTap(state, clickEvent(ctx, 0, 0))).toBeUndefined()
    expect(state.polygon.coordinates[0]).toHaveLength(0)
  })
})

describe('add-vertex button and doClick', () => {
  test('clicking the add-vertex button places a vertex at map center', () => {
    const { ctx, state, button } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.vertexButtonClickHandler({ target: button })
    expect(state.polygon.coordinates[0][0]).toEqual([CENTER.lng, CENTER.lat])
    expect(ctx.map._undoStack.length).toBe(1)
  })

  test('clicks elsewhere, without a button id, or during undo do nothing', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.vertexButtonClickHandler({ target: document.body })
    ctx.map._undoInProgress = true
    ctx.doClick(state)
    ctx.map._undoInProgress = false
    const noButton = setup(DrawPolygonMode, { addVertexButtonId: null })
    noButton.ctx.vertexButtonClickHandler({ target: document.body })
    expect(state.polygon.coordinates[0]).toHaveLength(0)
    expect(noButton.state.polygon.coordinates[0]).toHaveLength(0)
  })

  test('doClick places at the snapped position when snapping', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    ctx.map._snapInstance = activeSnap()
    ctx.doClick(state)
    expect(state.polygon.coordinates[0][0]).toEqual([9, 9])
    expect(ctx._ctx.store.render).toHaveBeenCalled()
  })

  test('line: activating add-vertex at the same spot twice finishes the line', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.doClick(state)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(1)
    expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', { featureIds: [state.line.id] })
  })

  test('polygon: a repeated add-vertex at the same spot is rejected without finishing', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.doClick(state)
    ctx.doClick(state)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
    expect(ctx.changeMode).not.toHaveBeenCalled()
  })
})

describe('keyboard interface', () => {
  test('arrow keys switch to keyboard interface, show the crosshair and move the rubber band to center', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    container.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('keyboard')
    expect(marker.style.display).toBe('block')
    expect(state.polygon.coordinates[0].at(-1)).toEqual([CENTER.lng, CENTER.lat])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)
  })

  test('other keys, unfocused container and Escape do not switch interface', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode)
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // container not focused
    container.focus()
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'a' }))
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'Escape' }))
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'a' }))
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('none')
  })

  test('keyup without focus is ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('mouse')
  })

  test('Enter down then up places a vertex at center', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.keydownHandler(new KeyboardEvent('keydown', { key: 'Enter' }))
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Enter' }))
    expect(state.isActive).toBe(true)
    expect(state.polygon.coordinates[0][0]).toEqual([CENTER.lng, CENTER.lat])
  })

  test('Escape keyup cancels drawing for mouse/touch but not keyboard', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(firedWith(ctx.map, 'draw.cancel')).toHaveLength(1)

    state.interfaceType = 'keyboard'
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'Escape' }))
    expect(firedWith(ctx.map, 'draw.cancel')).toHaveLength(1)
  })
})

describe('cmd/ctrl+z undo', () => {
  const undoKey = (overrides = {}) => {
    const e = new KeyboardEvent('keydown', { key: 'z', metaKey: true, ...overrides })
    e.preventDefault = jest.fn()
    e.stopPropagation = jest.fn()
    return e
  }

  test('removes the last placed vertex without switching to keyboard interface', () => {
    jest.useFakeTimers()
    const { ctx, state, marker } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)

    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0].map(([x]) => x)).toEqual([0, 10, 10])
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('none')
    expect(ctx.map._undoInProgress).toBe(true)
    jest.advanceTimersByTime(100)
    expect(ctx.map._undoInProgress).toBe(false)
  })

  test('mouse interface keeps the rubber band on the remaining last vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.keydownHandler(undoKey())
    const ring = state.polygon.coordinates[0]
    expect(ring[ring.length - 1]).toEqual(ring[ring.length - 2])
  })

  test('is ignored when typing in an input, when the stack is empty, or for other operations', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0]).toHaveLength(3)
    input.blur()

    ctx.map._undoStack.clear()
    ctx.keydownHandler(undoKey())
    ctx.map._undoStack.push({ type: 'edit_vertex' })
    ctx.keydownHandler(undoKey())
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('cmd+shift+z is not treated as undo', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    ctx.keydownHandler(undoKey({ shiftKey: true }))
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('ctrl+z (Windows/Linux) also undoes the last vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.keydownHandler(undoKey({ metaKey: false, ctrlKey: true }))
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })
})

describe('undo via draw.undo event and reinitialisation', () => {
  test('draw.undo with a draw_vertex operation removes the last vertex; other types are ignored', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.map.fire('draw.undo', { operation: { type: 'edit_vertex' } })
    expect(state.polygon.coordinates[0]).toHaveLength(4)
    ctx.map.fire('draw.undo', { operation: { type: 'draw_vertex' } })
    expect(state.polygon.coordinates[0]).toHaveLength(3)
  })

  test('keyboard interface moves the rubber band to center after undo', () => {
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    ctx.undoVertex(state)
    expect(state.polygon.coordinates[0].at(-1)).toEqual([CENTER.lng, CENTER.lat])
  })

  test('undoVertex returns false with nothing placed', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    expect(ctx.undoVertex(state)).toBe(false)
  })

  test('undoing the only polygon vertex reinitialises the feature in place with the same id', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    const id = state.polygon.id
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx._ctx.store.delete).toHaveBeenCalledWith([id])
    expect(state.polygon.id).toBe(id)
    expect(state.currentVertexPosition).toBe(0)
    expect(firedWith(ctx.map, 'draw.vertexchange').pop()).toEqual({ numVertecies: 1 })
  })

  test('undoing the only line vertex restarts draw_line with the same feature id', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.map._undoStack.push({ type: 'draw_vertex' })
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx.map._undoStack.length).toBe(0)
    expect(ctx._ctx.api.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      featureId: state.line.id,
      container: state.container,
      properties: state.properties
    }))
  })

  test('Escape (container keyUp) during keyboard drawing clears the undo stack and reinitialises', () => {
    const { ctx, state, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    container.focus()
    const id = state.polygon.id
    ctx.onKeyUp(state, { key: 'Escape' })
    expect(ctx.map._undoStack.length).toBe(0)
    expect(state.polygon.id).toBe(id)
  })

  test('container keyUp defers to the parent mode when focus is elsewhere, and ignores focus inside the container', () => {
    const { ctx, state, button, container } = setup(DrawPolygonMode)
    ctx.onKeyUp(state, { key: 'Enter' }) // focus not on container → parent finishes on Enter
    expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', expect.anything())

    button.focus()
    ctx.changeMode.mockClear()
    ctx.onKeyUp(state, { key: 'Enter' }) // focus on a child element → ignored
    expect(ctx.changeMode).not.toHaveBeenCalled()

    container.focus()
    ctx.onKeyUp(state, { key: 'Escape' }) // non-keyboard Escape → handled by window keyup instead
    expect(ctx._ctx.store.delete).not.toHaveBeenCalled()
  })
})

describe('touch and pointer interface', () => {
  test('touch start/end switch to touch interface and show the crosshair', () => {
    const { ctx, state, marker } = setup(DrawPolygonMode)
    ctx.onTouchStart(state, {})
    expect(state.interfaceType).toBe('touch')
    expect(marker.style.display).toBe('block')
    ctx.onTouchEnd(state, {})
    expect(state.interfaceType).toBe('touch')
  })

  test('non-touch pointerdown switches back to mouse without showing the crosshair; touch does not', () => {
    const { ctx, state, marker } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.map.fire('pointerdown', { pointerType: 'mouse' })
    expect(state.interfaceType).toBe('mouse')
    expect(marker.style.display).toBe('block') // unchanged, not re-shown or hidden

    ctx.map.fire('pointerdown', { pointerType: 'touch' })
    expect(state.interfaceType).toBe('mouse')
  })

  test('mouse pointermove hides the crosshair; touch pointermove does not', () => {
    const { ctx, marker } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.pointermoveHandler({ pointerType: 'touch' })
    expect(marker.style.display).toBe('block')
    ctx.pointermoveHandler({ pointerType: 'mouse' })
    expect(marker.style.display).toBe('none')
  })

  test('pointerup reports the current vertex count', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    ctx.map.fire.mockClear()
    ctx.pointerupHandler({})
    expect(firedWith(ctx.map, 'draw.vertexchange')).toEqual([{ numVertecies: 1 }])
  })

  test('blur away from the container hides the crosshair; blur on the container does not', () => {
    const { ctx, marker, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.blurHandler({ target: container })
    expect(marker.style.display).toBe('block')
    ctx.blurHandler({ target: document.body })
    expect(marker.style.display).toBe('none')
  })
})

describe('rubber band and snapping while moving', () => {
  test('onMouseMove moves the rubber band, preferring the snapped position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    clickAt(ctx, state, 0, 0)
    ctx.map._snapInstance = activeSnap()
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(ctx.map._snapInstance.snapToClosestPoint).toHaveBeenCalled()
    expect(state.polygon.coordinates[0].at(-1)).toEqual([9, 9])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)
  })

  test('onMouseMove without snap uses the pointer position', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.polygon.coordinates[0].at(-1)).toEqual([3, 3])
  })

  test('map move in keyboard interface keeps the rubber band at center, or at the snap point when snapping', () => {
    const { ctx, state } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    ctx.map.fire('move')
    expect(state.polygon.coordinates[0].at(-1)).toEqual([CENTER.lng, CENTER.lat])

    state.getSnapEnabled = () => true
    ctx.map._snapInstance = activeSnap()
    ctx.map.fire('move')
    expect(ctx.map._snapInstance.snapToClosestPoint).toHaveBeenCalled()
    expect(state.polygon.coordinates[0].at(-1)).toEqual([9, 9])
  })

  test('map move in mouse interface leaves the rubber band alone', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    const before = [...state.polygon.coordinates[0].map((c) => [...c])]
    ctx.map.fire('move')
    expect(state.polygon.coordinates[0]).toEqual(before)
  })
})

describe('vertex marker display', () => {
  const displayed = (ctx, state, geometry, id) => {
    const display = jest.fn()
    ctx.toDisplayFeatures(state, { type: 'Feature', properties: { id }, geometry }, display)
    return display.mock.calls.map(([f]) => f).filter((f) => f.properties.meta === 'draw-vertex')
  }

  test('every placed polygon vertex gets a display-only draw-vertex marker', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    const ring = [[0, 0], [10, 0], [10, 10], [5, 5], [0, 0]] // placed + rubber + closing
    const markers = displayed(ctx, state, { type: 'Polygon', coordinates: [ring] }, state.polygon.id)
    expect(markers.map((m) => m.geometry.coordinates)).toEqual([[0, 0], [10, 0], [10, 10]])
    expect(markers[0].properties).toEqual({ meta: 'draw-vertex', parent: state.polygon.id, active: 'false' })
  })

  test('every placed line vertex gets a marker', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    const coords = [[5, 5], [8, 8]] // placed + rubber
    const markers = displayed(ctx, state, { type: 'LineString', coordinates: coords }, state.line.id)
    expect(markers.map((m) => m.geometry.coordinates)).toEqual([[5, 5]])
  })

  test('other features get no markers', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    const ring = [[0, 0], [10, 0], [10, 10], [0, 0]]
    expect(displayed(ctx, state, { type: 'Polygon', coordinates: [ring] }, 'other-feature')).toEqual([])
  })
})

describe('create and stop', () => {
  test('draw.create re-ids the created feature to the requested featureId', () => {
    const { ctx } = setup(DrawPolygonMode)
    const feature = { id: 'temp-id' }
    ctx.map.fire('draw.create', { features: [feature] })
    expect(ctx._ctx.api.delete).toHaveBeenCalledWith('temp-id')
    expect(feature.id).toBe('shape-1')
    expect(ctx._ctx.api.add).toHaveBeenCalledWith(feature, { userProperties: true })
  })

  test('onStop removes listeners, hides the crosshair and reports the final interface type', () => {
    const { ctx, state, marker, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    ctx.onStop(state)
    expect(marker.style.display).toBe('none')
    expect(firedWith(ctx.map, 'draw.interfacetypechange')).toEqual([{ interfaceType: 'keyboard' }])

    // Window/container/map listeners are gone: keydown no longer shows the crosshair
    container.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(marker.style.display).toBe('none')
    expect(ctx.map.off).toHaveBeenCalledWith('draw.create', ctx.createHandler)
  })
})

describe('line mode mouse interactions', () => {
  test('mouse clicks place line vertices; moving then undoing keeps the rubber band on the last vertex', () => {
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    clickAt(ctx, state, 10, 10)
    expect(state.line.coordinates.map(([x]) => x)).toEqual([0, 10, 10, 10]) // 3 placed + rubber band

    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.line.coordinates.at(-1)).toEqual([3, 3])
    expect(firedWith(ctx.map, 'draw.geometrychange').length).toBeGreaterThan(0)

    ctx.map._undoStack.push({ type: 'draw_vertex' })
    ctx.undoVertex(state)
    const coords = state.line.coordinates
    expect(coords[coords.length - 1]).toEqual(coords[coords.length - 2])
  })

  test('a repeated mouse click at the last vertex adds no new vertex and does not finish the line', () => {
    const { ctx, state } = setup(DrawLineMode)
    clickAt(ctx, state, 0, 0)
    clickAt(ctx, state, 10, 0)
    const before = state.line.coordinates.length
    clickAt(ctx, state, 10, 0)
    expect(state.line.coordinates.length).toBe(before)
    expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
  })
})

describe('remaining snap, undo-stack and keyboard edge branches', () => {
  test('onMouseMove with snapping enabled but no snap point falls back to the pointer position', () => {
    const { ctx, state } = setup(DrawPolygonMode, { getSnapEnabled: () => true })
    clickAt(ctx, state, 0, 0)
    ctx.map._snapInstance = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    ctx.onMouseMove(state, { lngLat: { lng: 3, lat: 3 }, point: { x: 3, y: 3 } })
    expect(state.polygon.coordinates[0].at(-1)).toEqual([3, 3])
  })

  test('placing a vertex with no undo stack does not throw and still places the vertex', () => {
    const { ctx, state } = setup(DrawPolygonMode)
    ctx.map._undoStack = null
    clickAt(ctx, state, 0, 0)
    expect(state.polygon.coordinates[0][0]).toEqual([0, 0])
  })

  test('reinitialising a polygon without properties uses an empty properties object', () => {
    const { ctx, state } = setup(DrawPolygonMode, { properties: undefined })
    clickAt(ctx, state, 0, 0)
    expect(ctx.undoVertex(state)).toBe(true)
    expect(state.polygon.properties).toEqual({})
  })

  test('restarting a line with no undo stack still changes mode', () => {
    const { ctx, state } = setup(DrawLineMode)
    ctx.doClick(state)
    ctx.map._undoStack = null
    expect(ctx.undoVertex(state)).toBe(true)
    expect(ctx._ctx.api.changeMode).toHaveBeenCalledWith('draw_line', expect.objectContaining({
      featureId: state.line.id
    }))
  })

  test('keyup of a non-Enter interface key while focused switches interface without committing a vertex', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.keyupHandler(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    expect(state.interfaceType).toBe('keyboard')
    expect(ctx.map._undoStack.length).toBe(0)
  })

  test('container keyUp with the container itself focused and a non-Escape key does not defer to the parent', () => {
    const { ctx, state, container } = setup(DrawPolygonMode)
    container.focus()
    ctx.onKeyUp(state, { key: 'a' })
    expect(ctx.changeMode).not.toHaveBeenCalled()
  })

  test('Escape during keyboard drawing with no undo stack still reinitialises the feature', () => {
    const { ctx, state, container } = setup(DrawPolygonMode, { interfaceType: 'keyboard' })
    clickAt(ctx, state, 0, 0)
    container.focus()
    const id = state.polygon.id
    ctx.map._undoStack = null
    ctx.onKeyUp(state, { key: 'Escape' })
    expect(ctx._ctx.store.delete).toHaveBeenCalledWith([id])
  })
})
