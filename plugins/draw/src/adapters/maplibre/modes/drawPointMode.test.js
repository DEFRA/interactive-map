import { DrawPointMode } from './drawPointMode.js'
import { createUndoStack } from '../../../utils/undoStack.js'
import PointFeature from '../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/feature_types/point.js'

const CENTER = { lng: 5, lat: 5 }

const createMap = () => {
  const canvas = document.createElement('canvas')
  const listeners = {}
  return {
    _undoInProgress: false,
    _undoStack: null,
    _snapInstance: null,
    _drawGeometryValidator: undefined,
    getCanvas: () => canvas,
    getCenter: () => ({ ...CENTER }),
    project: jest.fn(() => ({ x: 50, y: 50 })),
    unproject: jest.fn(() => ({ ...CENTER })),
    fire: jest.fn(function (type, e) { (listeners[type] ?? []).forEach((h) => h(e)) }),
    on: jest.fn((type, h) => { (listeners[type] ??= []).push(h) }),
    off: jest.fn((type, h) => { listeners[type] = (listeners[type] ?? []).filter((x) => x !== h) })
  }
}

const contexts = []
const removeListeners = (ctx) => ctx._listeners?.forEach(([t, e, h]) =>
  t.removeEventListener ? t.removeEventListener(e, h) : t.off(e, h))

const createModeContext = () => {
  const map = createMap()
  const features = new Map()
  const store = {
    add: jest.fn((f) => features.set(f.id, f)),
    delete: jest.fn((ids) => ids.forEach((id) => features.delete(id))),
    render: jest.fn(),
    featureChanged: jest.fn(),
    getInitialConfigValue: jest.fn(() => true)
  }
  const api = { changeMode: jest.fn(), add: jest.fn(), delete: jest.fn() }
  const ctx = {
    map,
    _ctx: { store, api, options: { userProperties: true } },
    addFeature: (f) => store.add(f),
    getFeature: (id) => features.get(id),
    deleteFeature: jest.fn((ids) => ids.forEach((id) => features.delete(id))),
    clearSelectedFeatures: jest.fn(),
    updateUIClasses: jest.fn(),
    activateUIButton: jest.fn(),
    setActionableState: jest.fn(),
    changeMode: jest.fn()
  }
  ctx.newFeature = (geojson) => new PointFeature(ctx._ctx, geojson)
  Object.assign(ctx, DrawPointMode)
  contexts.push(ctx)
  return ctx
}

const createContainer = () => {
  const container = document.createElement('div')
  container.tabIndex = 0
  const button = document.createElement('button')
  button.id = 'add-point'
  container.appendChild(button)
  document.body.appendChild(container)
  return { container, button }
}

const createCrossHair = () => ({ show: jest.fn(), hide: jest.fn() })

const setup = (options = {}) => {
  const ctx = createModeContext()
  const dom = createContainer()
  ctx.map._undoStack = createUndoStack(() => {})
  const crossHair = createCrossHair()
  const state = ctx.onSetup({
    container: dom.container,
    addVertexButtonId: 'add-point',
    interfaceType: 'mouse',
    crossHair,
    featureId: 'point-1',
    properties: { label: 'a point' },
    ...options
  })
  return { ctx, state, crossHair, ...dom }
}

const clickEvent = (ctx, lng, lat, overrides = {}) => ({
  lngLat: { lng, lat },
  point: { x: lng, y: lat },
  originalEvent: { button: 0, target: ctx.map.getCanvas(), ...overrides }
})

const firedWith = (map, type) => map.fire.mock.calls.filter(([t]) => t === type).map(([, e]) => e)

afterEach(() => {
  contexts.splice(0).forEach(removeListeners)
  document.body.innerHTML = ''
})

describe('DrawPointMode', () => {
  describe('onSetup', () => {
    it('creates an empty in-progress point feature and applies caller properties', () => {
      const { state } = setup({ properties: { label: 'field' } })
      expect(state.point.type).toBe('Point')
      expect(state.point.coordinates).toEqual([])
      expect(state.point.properties).toEqual({ label: 'field' })
    })

    it('shows the crosshair for touch/keyboard interface types', () => {
      const { crossHair } = setup({ interfaceType: 'touch' })
      expect(crossHair.show).toHaveBeenCalled()
    })

    it('hides the crosshair for mouse', () => {
      const { crossHair } = setup({ interfaceType: 'mouse' })
      expect(crossHair.hide).toHaveBeenCalled()
    })
  })

  describe('onClick (mouse)', () => {
    it('commits the coordinate, re-ids the feature to the caller featureId, and fires draw.create', () => {
      const { ctx, state } = setup()
      ctx.onClick(state, clickEvent(ctx, 1, 2))
      expect(state.point.coordinates).toEqual([1, 2])
      const created = firedWith(ctx.map, 'draw.create')
      expect(created).toHaveLength(1)
      expect(created[0].features[0].geometry.coordinates).toEqual([1, 2])
      // Re-id happens via the internal draw.create listener registered in onSetup
      expect(ctx._ctx.api.delete).toHaveBeenCalled()
      expect(ctx._ctx.api.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'point-1' }),
        { userProperties: true }
      )
    })

    it('calls the adapter-injected resolvePointSymbol hook with the final featureId, after re-id', () => {
      const resolvePointSymbol = jest.fn()
      const { ctx, state } = setup({ resolvePointSymbol, properties: { symbol: 'pin' } })
      ctx.onClick(state, clickEvent(ctx, 1, 2))
      expect(resolvePointSymbol).toHaveBeenCalledWith('point-1', { symbol: 'pin' })
    })

    it('does not throw when no resolvePointSymbol hook was supplied', () => {
      const { ctx, state } = setup()
      expect(() => ctx.onClick(state, clickEvent(ctx, 1, 2))).not.toThrow()
    })

    it('ignores non-primary-button clicks', () => {
      const { ctx, state } = setup()
      ctx.onClick(state, clickEvent(ctx, 1, 2, { button: 1 }))
      expect(state.point.coordinates).toEqual([])
      expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
    })

    it('ignores clicks whose target is not the map canvas', () => {
      const { ctx, state } = setup()
      ctx.onClick(state, clickEvent(ctx, 1, 2, { target: document.createElement('div') }))
      expect(state.point.coordinates).toEqual([])
    })

    it('vetoes placement via onGeometryChange and never commits', () => {
      const { ctx, state } = setup()
      ctx.map._drawGeometryValidator = () => ({ valid: false, reason: 'not allowed here' })
      ctx.onClick(state, clickEvent(ctx, 1, 2))
      expect(state.point.coordinates).toEqual([])
      const blocked = firedWith(ctx.map, 'draw.placementblocked')
      expect(blocked).toHaveLength(1)
      expect(blocked[0]).toMatchObject({ reason: 'not allowed here', phase: 'place', mode: 'draw_point' })
      expect(firedWith(ctx.map, 'draw.create')).toHaveLength(0)
    })
  })

  describe('onTap', () => {
    it('behaves the same as onClick', () => {
      const { ctx, state } = setup()
      ctx.onTap(state, clickEvent(ctx, 3, 4))
      expect(state.point.coordinates).toEqual([3, 4])
    })
  })

  describe('crosshair / keyboard placement', () => {
    it('Enter commits at the map centre once keyboard interaction has started', () => {
      const { ctx, state, container } = setup({ interfaceType: 'keyboard' })
      container.focus()
      ctx.onKeydown(state, { key: 'Enter' })
      ctx.onKeyup(state, { key: 'Enter' })
      expect(state.point.coordinates).toEqual([CENTER.lng, CENTER.lat])
      expect(firedWith(ctx.map, 'draw.create')).toHaveLength(1)
    })

    it('does not commit on Enter before onKeydown has marked the session active', () => {
      const { ctx, state, container } = setup({ interfaceType: 'keyboard' })
      container.focus()
      ctx.onKeyup(state, { key: 'Enter' })
      expect(state.point.coordinates).toEqual([])
    })

    it('the "Add point" button commits at the map centre', () => {
      const { ctx, state, button } = setup()
      ctx.onVertexButtonClick(state, { target: button })
      expect(state.point.coordinates).toEqual([CENTER.lng, CENTER.lat])
      expect(firedWith(ctx.map, 'draw.create')).toHaveLength(1)
    })

    it('a click on an unrelated element does not commit', () => {
      const { ctx, state } = setup()
      ctx.onVertexButtonClick(state, { target: document.createElement('div') })
      expect(state.point.coordinates).toEqual([])
    })
  })

  describe('Escape', () => {
    it('fires draw.cancel regardless of interface type', () => {
      const { ctx, state } = setup({ interfaceType: 'mouse' })
      ctx.onKeyup(state, { key: 'Escape' })
      expect(firedWith(ctx.map, 'draw.cancel')).toHaveLength(1)
    })

    it('does not throw via the neutralised built-in capital onKeyUp', () => {
      const { ctx, state } = setup()
      expect(() => ctx.onKeyUp(state, { key: 'Enter' })).not.toThrow()
      expect(state.point.coordinates).toEqual([])
    })
  })

  describe('onStop', () => {
    it('deletes an uncommitted point', () => {
      const { ctx, state } = setup()
      ctx.onStop(state)
      expect(ctx.deleteFeature).toHaveBeenCalledWith([state.point.id], { silent: true })
    })

    it('keeps a committed point', () => {
      const { ctx, state } = setup()
      ctx.onClick(state, clickEvent(ctx, 1, 2))
      ctx.deleteFeature.mockClear()
      ctx.onStop(state)
      expect(ctx.deleteFeature).not.toHaveBeenCalled()
    })
  })

  describe('interface type tracking', () => {
    it('touch start shows the crosshair', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'mouse' })
      crossHair.show.mockClear()
      ctx.onTouchStart(state)
      expect(state.interfaceType).toBe('touch')
      expect(crossHair.show).toHaveBeenCalled()
    })

    it('a non-touch pointerdown switches interface type to mouse without forcing the crosshair visible', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'touch' })
      crossHair.show.mockClear()
      ctx.onPointerdown(state, { pointerType: 'mouse' })
      expect(state.interfaceType).toBe('mouse')
      expect(crossHair.show).not.toHaveBeenCalled()
    })

    it('a non-touch pointermove hides the crosshair', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'touch' })
      ctx.onPointermove(state, { pointerType: 'mouse' })
      expect(crossHair.hide).toHaveBeenCalled()
    })

    it('touch end shows the crosshair', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'mouse' })
      crossHair.show.mockClear()
      ctx.onTouchEnd(state)
      expect(state.interfaceType).toBe('touch')
      expect(crossHair.show).toHaveBeenCalled()
    })

    it('onInterfaceTypeChange only shows the crosshair for touch/keyboard', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'touch' })
      crossHair.show.mockClear()
      ctx.onInterfaceTypeChange(state, { interfaceType: 'mouse' })
      expect(state.interfaceType).toBe('mouse')
      expect(crossHair.show).not.toHaveBeenCalled()

      ctx.onInterfaceTypeChange(state, { interfaceType: 'keyboard' })
      expect(state.interfaceType).toBe('keyboard')
      expect(crossHair.show).toHaveBeenCalled()
    })

    it('blur outside the container hides the crosshair', () => {
      const { ctx, state, crossHair } = setup({ interfaceType: 'touch' })
      ctx.onBlur(state, { target: document.createElement('div') })
      expect(crossHair.hide).toHaveBeenCalled()
    })

    it('blur landing on the container itself does not hide the crosshair', () => {
      const { ctx, state, crossHair, container } = setup({ interfaceType: 'touch' })
      crossHair.hide.mockClear()
      ctx.onBlur(state, { target: container })
      expect(crossHair.hide).not.toHaveBeenCalled()
    })
  })

  describe('snap', () => {
    it('onMouseMove triggers a snap check at the pointer when snapping is enabled', () => {
      const { ctx, state } = setup()
      const snap = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
      ctx.map._snapInstance = snap
      state.getSnapEnabled = () => true
      ctx.onMouseMove(state, { point: { x: 7, y: 8 } })
      expect(snap.snapToClosestPoint).toHaveBeenCalledWith({ point: { x: 7, y: 8 }, lngLat: CENTER })
    })

    it('a real click commits the snapped coordinate when a snap candidate is active', () => {
      const { ctx, state } = setup()
      ctx.map._snapInstance = { status: true, snapStatus: true, snapCoords: [9, 9], snapToClosestPoint: jest.fn() }
      state.getSnapEnabled = () => true
      ctx.onClick(state, clickEvent(ctx, 1, 2))
      expect(state.point.coordinates).toEqual([9, 9])
    })

    it('crosshair placement snaps to a candidate found at the map centre', () => {
      const { ctx, state, button } = setup()
      const snap = { status: true, snapStatus: true, snapCoords: [9, 9], snapToClosestPoint: jest.fn() }
      ctx.map._snapInstance = snap
      state.getSnapEnabled = () => true
      ctx.onVertexButtonClick(state, { target: button })
      expect(snap.snapToClosestPoint).toHaveBeenCalled()
      expect(state.point.coordinates).toEqual([9, 9])
    })

    // Regression coverage: onMove used to be a no-op, so touch/keyboard users never saw a
    // live snap-target indicator while panning — it only ever checked at the moment of
    // commit, with nothing shown beforehand.
    it('onMove keeps the snap indicator live at the crosshair while panning, touch/keyboard only', () => {
      const { ctx, state } = setup({ interfaceType: 'touch' })
      const snap = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
      ctx.map._snapInstance = snap
      state.getSnapEnabled = () => true

      ctx.onMove(state)
      expect(snap.snapToClosestPoint).toHaveBeenCalledWith({ point: expect.any(Object), lngLat: CENTER })

      snap.snapToClosestPoint.mockClear()
      state.interfaceType = 'mouse'
      ctx.onMove(state)
      expect(snap.snapToClosestPoint).not.toHaveBeenCalled()
    })

    it('switching to touch or keyboard shows the snap indicator immediately, not just on the first pan', () => {
      const snap = { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }

      const touch = setup({ interfaceType: 'mouse' })
      touch.ctx.map._snapInstance = snap
      touch.state.getSnapEnabled = () => true
      touch.ctx.onTouchStart(touch.state)
      expect(snap.snapToClosestPoint).toHaveBeenCalled()

      snap.snapToClosestPoint.mockClear()
      const keyboard = setup({ interfaceType: 'mouse' })
      keyboard.ctx.map._snapInstance = snap
      keyboard.state.getSnapEnabled = () => true
      keyboard.container.focus()
      keyboard.ctx.onKeydown(keyboard.state, { key: 'ArrowUp' })
      expect(snap.snapToClosestPoint).toHaveBeenCalled()
    })
  })
})
