import { createEditMode } from './EditMode.js'
import { createFeatureStore } from '../core/featureStore.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { createFakeMap, createFakeManager, createContainer, domEvent } from '../__helpers__/harness.js'
import Style from 'ol/style/Style.js'
import Polygon from 'ol/geom/Polygon.js'

const RING = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]] // square: 4 vertices, deletable

const setup = (ring = RING) => {
  const map = createFakeMap()
  const manager = createFakeManager()
  manager.store = createFeatureStore()
  manager.store.add({ type: 'Feature', id: 'f1', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })
  const container = createContainer()
  map.getViewport().appendChild(container) // keyboard handler treats focus inside the viewport as map focus
  const mode = createEditMode({
    map,
    manager,
    options: { featureId: 'f1', container, interfaceType: 'mouse', deleteVertexButtonId: 'del-v', snap: null }
  })
  liveModes.push(mode)
  const olFeature = manager.store.getOL('f1')
  const tapAt = (x, y) => {
    container.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: x, clientY: y }] }))
    container.dispatchEvent(domEvent('touchend', { changedTouches: [{ clientX: x, clientY: y }] }))
  }
  return { map, manager, container, mode, olFeature, ring: () => olFeature.getGeometry().getCoordinates()[0], tapAt }
}

const liveModes = []
afterEach(() => {
  liveModes.splice(0).forEach((m) => m?.destroy())
  document.body.innerHTML = ''
})

const key = (type, props) => window.dispatchEvent(new KeyboardEvent(type, { cancelable: true, ...props }))

test('returns null for an unknown feature id', () => {
  const { map, manager } = setup()
  expect(createEditMode({ map, manager, options: { featureId: 'nope', container: createContainer() } })).toBeNull()
})

test('entering edit mode swaps the feature style and reports the initial vertex state', () => {
  const { manager, olFeature } = setup()
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyle)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_CHANGE, { numVertices: 4 })
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.UPDATE, expect.objectContaining({ id: 'f1' }))
})

test('setInvalid swaps between the solid and dashed edit styles', () => {
  const { manager, mode, olFeature } = setup()
  mode.setInvalid(true)
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyleInvalid)
  mode.setInvalid(false)
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyle)
})

test('a mid-drag crossing turns the stroke dashed live, and back when it clears', () => {
  const { manager, olFeature } = setup()
  // Geometry mutation (as during a Modify/touch drag) — no commit yet.
  olFeature.getGeometry().setCoordinates([[[0, 0], [100, 100], [100, 0], [0, 100], [0, 0]]])
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyleInvalid)
  olFeature.getGeometry().setCoordinates([[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]])
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyle)
})

test('validity flips while editing also gate the Done button', () => {
  const { manager, olFeature } = setup()
  olFeature.getGeometry().setCoordinates([[[0, 0], [100, 100], [100, 0], [0, 100], [0, 0]]])
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VALIDITY_CHANGE,
    expect.objectContaining({ valid: false, reason: expect.any(String) }))
  olFeature.getGeometry().setCoordinates([[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]])
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VALIDITY_CHANGE,
    expect.objectContaining({ valid: true }))
})

test('the user callback runs throttled during an edit drag', () => {
  jest.useFakeTimers()
  const { manager, olFeature } = setup()
  manager._geometryValidator = jest.fn(() => ({ valid: false, reason: 'outside region' }))
  olFeature.getGeometry().setCoordinates([[[0, 0], [110, 0], [100, 100], [0, 100], [0, 0]]])
  olFeature.getGeometry().setCoordinates([[[0, 0], [120, 0], [100, 100], [0, 100], [0, 0]]])
  expect(manager._geometryValidator).not.toHaveBeenCalled() // deferred to the frame
  jest.runAllTimers()
  expect(manager._geometryValidator).toHaveBeenCalledTimes(1) // trailing edge only
  expect(olFeature.getStyle()).toBe(manager.styles.editFeatureStyleInvalid)
  jest.useRealTimers()
})

test('done() emits the edited feature; cancel() is a no-op', () => {
  const { manager, mode } = setup()
  mode.done()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.EDIT_FINISH, expect.objectContaining({ id: 'f1' }))
  expect(mode.cancel()).toBeUndefined()
})

test('select via pointer, delete the vertex, then undo restores it', () => {
  const { container, manager, mode, ring } = setup()
  container.dispatchEvent(domEvent('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 0 }))
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.objectContaining({ index: 1 }))

  mode.deleteVertex()
  expect(ring()).toHaveLength(4) // one vertex fewer (closed ring keeps closing coord)
  expect(manager.undoStack.length).toBe(1)

  mode.undo()
  expect(ring()).toHaveLength(5)
  expect(ring()[1]).toEqual([100, 0])
  mode.undo() // empty stack — no-op
})

test('undo re-validates with the inverse change kind (undo of a delete re-inserts)', () => {
  jest.useFakeTimers()
  const { container, manager, mode } = setup()
  container.dispatchEvent(domEvent('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 0 }))
  mode.deleteVertex()
  jest.runAllTimers()
  manager.emit.mockClear()
  mode.undo()
  jest.runAllTimers()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.GEOMETRY_CHANGE, expect.objectContaining({
    kind: 'insert',
    vertexIndex: 1,
    feature: expect.any(Object)
  }))
  jest.useRealTimers()
})

test('a Modify drag pushes a move op derived from the before/after vertices', () => {
  const { map, manager, olFeature } = setup()
  const interaction = map.interactions[0]
  interaction.dispatchEvent({ type: 'modifystart' })
  olFeature.getGeometry().setCoordinates([[[0, 0], [120, 5], [100, 100], [0, 100], [0, 0]]])
  interaction.dispatchEvent({ type: 'modifyend' })
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 1, previousCoord: [100, 0] })
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.objectContaining({ index: 1 }))

  interaction.dispatchEvent({ type: 'modifystart' })
  interaction.dispatchEvent({ type: 'modifyend' }) // no coordinate change — nothing pushed
  expect(manager.undoStack.length).toBe(0)
})

test('deleting needs a selected vertex and respects the minimum ring size', () => {
  const { mode, manager } = setup()
  mode.deleteVertex() // nothing selected
  expect(manager.undoStack.length).toBe(0)

  const triangle = setup([[0, 0], [100, 0], [100, 100], [0, 0]])
  triangle.container.dispatchEvent(domEvent('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 0 }))
  triangle.mode.deleteVertex() // 3 vertices is the minimum for a ring
  expect(triangle.ring()).toHaveLength(4)
  expect(triangle.manager.undoStack.length).toBe(0)
})

test('keyboard: arrows nudge the selected vertex and commit one undo op on keyup', () => {
  const { container, manager, ring } = setup()
  container.dispatchEvent(domEvent('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 0 }))
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(ring()[1]).toEqual([105, 0])
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 1, previousCoord: [100, 0] })
})

test('keyboard: Space selects the midpoint nearest the crosshair; nudging inserts it as a vertex', () => {
  const { manager, ring } = setup()
  key('keydown', { key: ' ' }) // nearest handle to center [50,50] is the midpoint [50,0]... all midpoints are at 50
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(ring()).toHaveLength(6)
  expect(ring()[1]).toEqual([55, 0]) // inserted at the midpoint, nudged one step right
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 1, previousCoord: [50, 0] })
  expect(manager.undoStack.pop()).toEqual({ type: 'insert_vertex', vertexIndex: 1 })
})

test('touch: dragging the offset target moves the vertex and records one move op', () => {
  const { container, manager, mode, tapAt, ring } = setup()
  tapAt(100, 0)
  mode.setInterfaceType('touch')
  // The finger lands on the SVG's inner circle, not the SVG element itself
  const grip = container.querySelector('[data-im-draw-touch-target] circle')
  grip.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: 100, clientY: 0 }] }))
  grip.dispatchEvent(domEvent('touchmove', { touches: [{ clientX: 120, clientY: 10 }] }))
  grip.dispatchEvent(domEvent('touchend', { changedTouches: [{ clientX: 120, clientY: 10 }] }))
  expect(ring()[1]).toEqual([120, 10])
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 1, previousCoord: [100, 0] })
})

test('touch: tapping a midpoint inserts a vertex there and selects it', () => {
  const { manager, tapAt, ring } = setup()
  tapAt(50, 0) // midpoint between [0,0] and [100,0]
  expect(ring()).toHaveLength(6)
  expect(ring()[1]).toEqual([50, 0])
  expect(manager.undoStack.pop()).toEqual({ type: 'insert_vertex', vertexIndex: 1 })
})

test('touch: tapping a stale midpoint the geometry can no longer place is a no-op', () => {
  const { manager, olFeature, ring, tapAt } = setup()
  // Desync state from geometry: swap in a smaller geometry object so the
  // selection-state change listener (bound to the previous geometry) never
  // fires. state.midpoints still describes the 4-vertex square (4 midpoints),
  // while the live geometry is a 3-vertex triangle that has only 3 midpoints.
  olFeature.setGeometry(new Polygon([[[0, 0], [100, 0], [100, 100], [0, 0]]]))
  tapAt(0, 50) // the stale square's left-edge midpoint (index 3) — the triangle can't place it
  expect(manager.undoStack.length).toBe(0)
  expect(ring()).toHaveLength(4) // triangle geometry left untouched
})

test('undo in touch mode repositions the offset target on the restored vertex', () => {
  const { container, manager, mode, tapAt } = setup()
  tapAt(100, 0)
  key('keydown', { key: 'ArrowRight' }) // keyboard nudge (switches interface to keyboard)
  key('keyup', { key: 'ArrowRight' })
  mode.setInterfaceType('touch')
  mode.undo()
  const target = container.querySelector('[data-im-draw-touch-target]')
  expect(target.style.display).toBe('block')
  expect(manager.undoStack.length).toBe(0)
})

test('touch tap selects a vertex and interface switching shows/hides the touch target', () => {
  const { container, manager, mode, tapAt } = setup()
  tapAt(100, 0)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.objectContaining({ index: 1 }))

  const target = container.querySelector('[data-im-draw-touch-target]')
  mode.setInterfaceType('touch')
  expect(target.style.display).toBe('block')
  mode.setInterfaceType('touch') // same type — no change
  mode.setInterfaceType('mouse')
  expect(target.style.display).toBe('none')
})

test('a tap on empty map deselects', () => {
  const { manager, tapAt } = setup()
  tapAt(100, 0)
  tapAt(500, 500)
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.objectContaining({ index: -1 }))
})

test('style changes re-style the feature and handles', () => {
  const { manager, olFeature } = setup()
  const newStyles = { ...manager.styles, editFeatureStyle: new Style({}) }
  manager.emit(STYLES_CHANGED_EVENT, newStyles)
  expect(olFeature.getStyle()).toBe(newStyles.editFeatureStyle)
})

test('map resize repositions the touch target after the next render — touch with a selection only', () => {
  const { map, mode, tapAt } = setup()
  map.emit('change:size') // mouse interface — EditMode's own resize hook ignores it
  tapAt(100, 0)
  mode.setInterfaceType('touch')
  map.emit('change:size')
  map.emit('postrender') // once-listener fires; must not throw
  expect(map.once).toHaveBeenCalledWith('postrender', expect.any(Function))
})

test('destroy removes interactions, layers and listeners, and restores the feature style', () => {
  const { map, mode, olFeature } = setup()
  mode.destroy()
  expect(map.interactions).toHaveLength(0)
  expect(map.layers).toHaveLength(0)
  expect(olFeature.getStyle()).toBeNull()
})
