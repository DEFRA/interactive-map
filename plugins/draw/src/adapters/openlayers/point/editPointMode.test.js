import { createEditPointMode } from './editPointMode.js'
import { createFeatureStore } from '../core/featureStore.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { createFakeMap, createFakeManager, createContainer, domEvent } from '../__helpers__/harness.js'

const setup = (coordinates = [5, 5], snap = null) => {
  const map = createFakeMap()
  const manager = createFakeManager()
  manager.store = createFeatureStore()
  manager.store.add({ type: 'Feature', id: 'f1', properties: {}, geometry: { type: 'Point', coordinates } })
  const container = createContainer()
  map.getViewport().appendChild(container)
  const mode = createEditPointMode({
    map,
    manager,
    options: { featureId: 'f1', container, interfaceType: 'mouse', snap }
  })
  liveModes.push(mode)
  const olFeature = manager.store.getOL('f1')
  const tapAt = (x, y) => {
    container.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: x, clientY: y }] }))
    container.dispatchEvent(domEvent('touchend', { changedTouches: [{ clientX: x, clientY: y }] }))
  }
  return { map, manager, container, mode, olFeature, coord: () => olFeature.getGeometry().getCoordinates(), tapAt }
}

const liveModes = []
afterEach(() => {
  liveModes.splice(0).forEach((m) => m?.destroy())
  document.body.innerHTML = ''
})

const key = (type, props) => window.dispatchEvent(new KeyboardEvent(type, { cancelable: true, ...props }))

test('returns null for an unknown feature id', () => {
  const { map, manager } = setup()
  expect(createEditPointMode({ map, manager, options: { featureId: 'nope', container: createContainer() } })).toBeNull()
})

test('entering edit mode claims the D-pad exactly once, never emitting VERTEX_CHANGE', () => {
  const { manager } = setup()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, { index: 0, numVertices: 1 })
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_CHANGE, expect.anything())
})

test('sets the feature style once at construction, to the selected-icon override — nothing else re-touches it', () => {
  const { olFeature, container, manager } = setup()
  expect(olFeature.getStyle()).toEqual(expect.any(Function))
  olFeature.getStyle()()
  expect(manager.styles.selectedPointStyleFor).toHaveBeenCalledWith(olFeature)

  const setStyleSpy = jest.spyOn(olFeature, 'setStyle')
  olFeature.getGeometry().setCoordinates([9, 9])
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  container.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: 9, clientY: 9 }] }))
  expect(setStyleSpy).not.toHaveBeenCalled()
})

test('destroy restores the feature\'s pre-edit style', () => {
  const { mode, olFeature } = setup()
  const selectedStyleFn = olFeature.getStyle()
  mode.destroy()
  expect(olFeature.getStyle()).toBeNull() // unset before entering edit_point → falls back to the layer style
  expect(olFeature.getStyle()).not.toBe(selectedStyleFn)
})

test('validity flips (user callback only — a Point has no built-in HARD_RULES violation) gate the Done button', () => {
  jest.useFakeTimers()
  const { manager, olFeature } = setup()
  manager._geometryValidator = jest.fn(() => ({ valid: false, reason: 'outside region' }))
  olFeature.getGeometry().setCoordinates([9, 9])
  jest.runAllTimers()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.VALIDITY_CHANGE,
    expect.objectContaining({ valid: false, reason: 'outside region' }))
  jest.useRealTimers()
})

test('done() emits the edited feature; cancel() is a no-op', () => {
  const { manager, mode } = setup()
  mode.done()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.EDIT_FINISH, expect.objectContaining({ id: 'f1' }))
  expect(mode.cancel()).toBeUndefined()
})

test('setInvalid routes through the live-stroke controller without touching the feature style', () => {
  const { mode, olFeature } = setup()
  const setStyleSpy = jest.spyOn(olFeature, 'setStyle')
  mode.setInvalid(true)
  mode.setInvalid(false)
  expect(setStyleSpy).not.toHaveBeenCalled()
})

test('deleteVertex is a documented no-op — whole-feature deletion is deleteFeature\'s job', () => {
  const { mode, coord } = setup()
  const before = coord()
  expect(() => mode.deleteVertex()).not.toThrow()
  expect(coord()).toEqual(before)
})

test('a mouse drag pushes a move_vertex op derived from the before/after coordinate', () => {
  const { map, manager, olFeature } = setup()
  const interaction = map.interactions[0]
  map.forEachFeatureAtPixel = jest.fn((pixel, cb) => cb(olFeature))
  const down = { originalEvent: {}, pixel: [5, 5] }
  expect(interaction.handleDownEvent(down)).toBe(true)
  interaction.handleDragEvent({ pixel: [9, 9] })
  interaction.handleUpEvent()
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 0, previousCoord: [5, 5] })

  expect(interaction.handleDownEvent(down)).toBe(true)
  interaction.handleUpEvent() // no drag in between — no coordinate change, nothing pushed
  expect(manager.undoStack.length).toBe(0)
})

// OL only calls handleDragEvent/handleUpEvent between a handleDownEvent that returned true and
// the matching release, but both guard against being invoked outside that sequence regardless.
test('handleDragEvent and handleUpEvent are no-ops without a preceding successful handleDownEvent', () => {
  const { map, manager, olFeature, coord } = setup()
  const interaction = map.interactions[0]

  interaction.handleDragEvent({ pixel: [9, 9] }) // no down event — no grab offset captured yet
  expect(coord()).toEqual([5, 5])

  expect(() => interaction.handleUpEvent()).not.toThrow()
  expect(manager.undoStack.length).toBe(0) // no start coordinate — nothing to derive an op from
  expect(olFeature.getGeometry().getCoordinates()).toEqual([5, 5])
})

// The mouse click can land anywhere on the icon, not just on top of its anchor coordinate —
// dragging must move the point by the same delta as the pointer, not snap the anchor under it
// (unlike OL's own Modify, which always sets the dragged coordinate to the pointer position).
test('a mouse drag preserves the click\'s offset from the anchor instead of snapping to the pointer', () => {
  const { map, olFeature } = setup([5, 5])
  const interaction = map.interactions[0]
  map.forEachFeatureAtPixel = jest.fn((pixel, cb) => cb(olFeature))
  // Click 3 map-units up-left of the anchor (e.g. near the top of a pin icon).
  interaction.handleDownEvent({ originalEvent: {}, pixel: [2, 2] })
  interaction.handleDragEvent({ pixel: [2, 2] }) // no pointer movement yet
  expect(olFeature.getGeometry().getCoordinates()).toEqual([5, 5]) // anchor did NOT jump to [2, 2]

  interaction.handleDragEvent({ pixel: [12, 2] }) // pointer moves 10 units right
  expect(olFeature.getGeometry().getCoordinates()).toEqual([15, 5]) // anchor moves the same 10 units
})

// snap/snapInteraction.js's OL Interaction rewrites mapBrowserEvent.coordinate to the nearest
// candidate near the raw POINTER position — right for Modify, wrong here, since it would snap
// to whatever's near the cursor rather than near the icon's own anchor. This asserts snap.apply
// gets called with the offset-corrected anchor candidate, not the raw event coordinate.
test('a mouse drag snaps the icon\'s own offset-corrected position, not the raw pointer', () => {
  const snap = { apply: jest.fn((coord) => [coord[0] + 100, coord[1] + 100]), hideIndicator: jest.fn() }
  const { map, olFeature } = setup([5, 5], snap)
  const interaction = map.interactions[0]
  map.forEachFeatureAtPixel = jest.fn((pixel, cb) => cb(olFeature))

  // Click 3 map-units up-left of the anchor, then drag 10 units right.
  interaction.handleDownEvent({ originalEvent: {}, pixel: [2, 2] })
  // mapBrowserEvent.coordinate deliberately left stale/wrong here — a real snapInteraction may
  // have already rewritten it to something near the cursor before this interaction runs, and
  // the fix must ignore it in favour of .pixel.
  interaction.handleDragEvent({ pixel: [12, 2], coordinate: [999, 999] })

  expect(snap.apply).toHaveBeenCalledWith([15, 5]) // the icon's own candidate position, not [999, 999]
  expect(olFeature.getGeometry().getCoordinates()).toEqual([115, 105]) // snap.apply's result is applied

  // The indicator must stay showing after the drag ends — snap.apply()'s own last call already
  // left it correctly reflecting the snapped position (matches the ML adapter, which never
  // hides its own indicator on release either).
  interaction.handleUpEvent()
  expect(snap.hideIndicator).not.toHaveBeenCalled()
})

// A symbol icon renders far bigger than PIXEL_TOLERANCE (tuned for a plain ~6px vertex dot)
// covers, so the mouse hit-test uses OL's own forEachFeatureAtPixel against the icon's real
// rendered pixels instead of a fixed-radius distance check.
describe('mouse hit-testing respects the icon\'s own rendered pixels, not a fixed radius', () => {
  test('engages when forEachFeatureAtPixel hits this exact feature', () => {
    const { map, olFeature } = setup()
    map.forEachFeatureAtPixel = jest.fn((pixel, cb) => cb(olFeature))
    const interaction = map.interactions[0]
    expect(interaction.handleDownEvent({ originalEvent: { clientX: 5, clientY: 5 }, pixel: [5, 5] })).toBe(true)
    expect(map.forEachFeatureAtPixel).toHaveBeenCalledWith([5, 5], expect.any(Function), { hitTolerance: expect.any(Number) })
  })

  test('does not engage when forEachFeatureAtPixel finds nothing', () => {
    const { map } = setup()
    map.forEachFeatureAtPixel = jest.fn(() => undefined)
    const interaction = map.interactions[0]
    expect(interaction.handleDownEvent({ originalEvent: { clientX: 5, clientY: 5 }, pixel: [5, 5] })).toBe(false)
  })

  test('does not engage for a different feature under the pixel', () => {
    const { map } = setup()
    const otherFeature = {}
    map.forEachFeatureAtPixel = jest.fn((pixel, cb) => cb(otherFeature))
    const interaction = map.interactions[0]
    expect(interaction.handleDownEvent({ originalEvent: { clientX: 5, clientY: 5 }, pixel: [5, 5] })).toBe(false)
  })

  test('bails for touch without even querying', () => {
    const { map, mode } = setup()
    mode.setInterfaceType('touch')
    map.forEachFeatureAtPixel = jest.fn()
    const interaction = map.interactions[0]
    expect(interaction.handleDownEvent({ originalEvent: { clientX: 5, clientY: 5 }, pixel: [5, 5] })).toBe(false)
    expect(map.forEachFeatureAtPixel).not.toHaveBeenCalled()
  })
})

test('nudgeSelectedVertex (MoveControls D-pad) moves the point and is undoable', () => {
  const { manager, mode, coord } = setup()
  mode.nudgeSelectedVertex(1, 0, true)
  expect(coord()).not.toEqual([5, 5])
  expect(manager.undoStack.length).toBe(1)

  mode.undo()
  expect(coord()).toEqual([5, 5])
  mode.undo() // empty stack — no-op
})

test('undo re-validates with the commit-move phase', () => {
  jest.useFakeTimers()
  const { manager, mode } = setup()
  mode.nudgeSelectedVertex(1, 0, true)
  jest.runAllTimers()
  manager.emit.mockClear()
  mode.undo()
  jest.runAllTimers()
  expect(manager.emit).toHaveBeenCalledWith(ADAPTER_EVENTS.GEOMETRY_CHANGE, expect.objectContaining({
    phase: 'commit-move',
    vertexIndex: 0,
    feature: expect.any(Object)
  }))
  jest.useRealTimers()
})

test('keyboard: arrows nudge the point and commit one undo op on keyup', () => {
  const { manager, coord } = setup()
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(coord()).not.toEqual([5, 5])
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 0, previousCoord: [5, 5] })
})

test('keyboard: Delete is a no-op — there is no delete-vertex action for a point', () => {
  const { coord } = setup()
  key('keyup', { key: 'Delete' })
  expect(coord()).toEqual([5, 5])
})

test('keyboard: Cmd/Ctrl+Z undoes via the same op-popping logic as mode.undo()', () => {
  const { manager, coord } = setup()
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(manager.undoStack.length).toBe(1)
  key('keydown', { key: 'z', metaKey: true })
  expect(coord()).toEqual([5, 5])
  expect(manager.undoStack.length).toBe(0)
})

test('keyboard: Escape and Space are inert — the point cannot be deselected, and there is nothing else to select', () => {
  const { manager, coord } = setup()
  manager.emit.mockClear()
  key('keydown', { key: 'Escape' })
  key('keydown', { key: ' ' })
  expect(manager.emit).not.toHaveBeenCalledWith(ADAPTER_EVENTS.VERTEX_SELECTION, expect.anything())
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(coord()).not.toEqual([5, 5]) // arrows still work after Escape/Space
})

test('touch: dragging the offset target moves the point and records one move op', () => {
  const { container, manager, mode, tapAt, coord } = setup()
  tapAt(5, 5)
  mode.setInterfaceType('touch')
  const grip = container.querySelector('[data-im-draw-touch-target] circle')
  grip.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: 5, clientY: 5 }] }))
  grip.dispatchEvent(domEvent('touchmove', { touches: [{ clientX: 20, clientY: 15 }] }))
  grip.dispatchEvent(domEvent('touchend', { changedTouches: [{ clientX: 20, clientY: 15 }] }))
  expect(coord()).toEqual([20, 15])
  expect(manager.undoStack.pop()).toEqual({ type: 'move_vertex', vertexIndex: 0, previousCoord: [5, 5] })
})

test('touch: a tap never relocates the point — only the offset-target drag and the D-pad do', () => {
  const { manager, tapAt, coord } = setup()
  manager.undoStack.clear()
  tapAt(5, 5)
  expect(coord()).toEqual([5, 5])
  expect(manager.undoStack.length).toBe(0)
})

test('setInterfaceType shows/hides the touch target, and is a no-op for the same type', () => {
  const { container, mode } = setup()
  const target = container.querySelector('[data-im-draw-touch-target]')
  mode.setInterfaceType('touch')
  expect(target.style.display).toBe('block')
  mode.setInterfaceType('touch') // same type — no change
  mode.setInterfaceType('mouse')
  expect(target.style.display).toBe('none')
})

test('style changes refresh the touch target colours, without touching the feature style', () => {
  const { manager, olFeature } = setup()
  const setStyleSpy = jest.spyOn(olFeature, 'setStyle')
  const newStyles = { ...manager.styles }
  manager.styles = newStyles
  manager.emit(STYLES_CHANGED_EVENT, newStyles)
  expect(setStyleSpy).not.toHaveBeenCalled()
})

test('map resize repositions the touch target after the next render — touch only', () => {
  const { map, mode } = setup()
  map.emit('change:size') // mouse interface — ignored
  mode.setInterfaceType('touch')
  map.emit('change:size')
  map.emit('postrender') // once-listener fires; must not throw
  expect(map.once).toHaveBeenCalledWith('postrender', expect.any(Function))
})

test('destroy removes the point drag interaction and listeners', () => {
  const { map, mode } = setup()
  const interactionsBefore = map.interactions.length
  mode.destroy()
  expect(map.removeInteraction).toHaveBeenCalled()
  expect(map.interactions.length).toBeLessThan(interactionsBefore)
})
