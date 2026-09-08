import { createKeyboardHandler } from './keyboardHandler.js'
import { createFakeMap, polygonFeature } from '../__helpers__/harness.js'

const RING = [[0, 0], [100, 0], [100, 100], [0, 0]]

const setup = () => {
  const map = createFakeMap({ center: [98, 98] }) // crosshair near vertex [100, 100]
  const state = {
    olFeature: polygonFeature(RING),
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertices: [[0, 0], [100, 0], [100, 100]],
    midpoints: [[50, 0], [100, 50], [50, 50]]
  }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const callbacks = {
    onVertexMoved: jest.fn(),
    onInserted: jest.fn(),
    onDeleted: jest.fn(),
    onUndo: jest.fn(),
    onKeyboardActive: jest.fn()
  }
  const handler = createKeyboardHandler({ map, getState: () => state, setState, snap: null, ...callbacks })
  liveHandlers.push(handler)
  return { map, state, setState, handler, ...callbacks }
}

const liveHandlers = []
afterEach(() => {
  liveHandlers.splice(0).forEach((handler) => handler.destroy())
  document.body.innerHTML = ''
})

const key = (type, props) => window.dispatchEvent(new KeyboardEvent(type, { cancelable: true, ...props }))

test('nudgeByDelta (exposed for MoveControls) moves the selected vertex and reports it via onVertexMoved', () => {
  const { state, handler, onVertexMoved } = setup()
  Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
  handler.nudgeByDelta(1, 0, true)
  expect(state.vertices[1]).not.toEqual([100, 0])
  expect(onVertexMoved).toHaveBeenCalledWith(expect.objectContaining({ vertexIndex: 1 }))
})

test('Space selects the vertex or midpoint nearest the crosshair, only when nothing is selected', () => {
  const { state, setState, onKeyboardActive } = setup()
  key('keydown', { key: ' ' })
  expect(state.selectedVertexIndex).toBe(2) // [100, 100] is nearest [98, 98]
  expect(state.selectedVertexType).toBe('vertex')
  expect(onKeyboardActive).toHaveBeenCalled()
  setState.mockClear()
  key('keydown', { key: ' ' })
  expect(setState).not.toHaveBeenCalled()
})

test('Space selects a midpoint when it is the handle nearest the crosshair', () => {
  const map = createFakeMap({ center: [100, 48] }) // crosshair beside midpoint [100, 50]
  const state = {
    olFeature: polygonFeature(RING),
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertices: [[0, 0], [100, 0], [100, 100]],
    midpoints: [[50, 0], [100, 50], [50, 50]]
  }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const handler = createKeyboardHandler({
    map,
    getState: () => state,
    setState,
    snap: null,
    onVertexMoved: jest.fn(),
    onInserted: jest.fn(),
    onDeleted: jest.fn(),
    onUndo: jest.fn(),
    onKeyboardActive: jest.fn()
  })
  liveHandlers.push(handler)
  key('keydown', { key: ' ' })
  expect(state.selectedVertexIndex).toBe(4) // midpoint [100, 50]
  expect(state.selectedVertexType).toBe('midpoint')
})

test('Alt+Arrow navigates the selection to the nearest handle in that direction', () => {
  const { state } = setup()
  Object.assign(state, { selectedVertexIndex: 2, selectedVertexType: 'vertex' })
  key('keydown', { key: 'ArrowUp', altKey: true })
  expect(state.selectedVertexIndex).toBe(4) // midpoint [100, 50] is nearest above [100, 100]
  expect(state.selectedVertexType).toBe('midpoint')
})

test('Alt+Arrow with nothing selected navigates relative to the crosshair', () => {
  const { state } = setup()
  key('keydown', { key: 'ArrowUp', altKey: true }) // no selection → start from crosshair [98, 98]
  expect(state.selectedVertexIndex).toBe(4) // midpoint [100, 50] above the crosshair
  expect(state.selectedVertexType).toBe('midpoint')
})

test('Alt+Arrow can land the selection on a vertex', () => {
  const { state } = setup()
  Object.assign(state, { selectedVertexIndex: 4, selectedVertexType: 'midpoint' }) // midpoint [100, 50]
  key('keydown', { key: 'ArrowUp', altKey: true })
  expect(state.selectedVertexIndex).toBe(1) // vertex [100, 0] directly above
  expect(state.selectedVertexType).toBe('vertex')
})

test('a plain arrow nudges the selected vertex, and keyup commits a single move op', () => {
  const { state, onVertexMoved } = setup()
  Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
  key('keydown', { key: 'ArrowRight' })
  key('keydown', { key: 'ArrowRight' })
  expect(state.vertices[1]).toEqual([110, 0])

  key('keyup', { key: 'ArrowRight' })
  expect(onVertexMoved).toHaveBeenCalledWith({ vertexIndex: 1, previousCoord: [100, 0] })
  key('keyup', { key: 'ArrowRight' }) // no pending move — not committed twice
  expect(onVertexMoved).toHaveBeenCalledTimes(1)
})

// Regression: keyup used to force-hide the snap indicator unconditionally, so it vanished the
// instant the key was released even when the vertex landed exactly on a snap target — making it
// impossible to tell whether the nudge had actually snapped. nudge.js's own snap.apply() already
// leaves the indicator correctly reflecting reality; keyup must leave it alone (mirrors the ML
// adapter, which never hides its own indicator on keyup either).
test('keyup does not hide the snap indicator', () => {
  const snap = { apply: jest.fn((c) => c), hideIndicator: jest.fn(), snapRadius: 12 }
  const map = createFakeMap({ center: [98, 98] })
  const state = {
    olFeature: polygonFeature(RING),
    selectedVertexIndex: 1,
    selectedVertexType: 'vertex',
    vertices: [[0, 0], [100, 0], [100, 100]],
    midpoints: [[50, 0], [100, 50], [50, 50]]
  }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const handler = createKeyboardHandler({
    map,
    getState: () => state,
    setState,
    snap,
    onVertexMoved: jest.fn(),
    onInserted: jest.fn(),
    onDeleted: jest.fn(),
    onUndo: jest.fn(),
    onKeyboardActive: jest.fn()
  })
  liveHandlers.push(handler)
  key('keydown', { key: 'ArrowRight' })
  key('keyup', { key: 'ArrowRight' })
  expect(snap.hideIndicator).not.toHaveBeenCalled()
})

test('arrows without a selection do nothing', () => {
  const { setState } = setup()
  key('keydown', { key: 'ArrowRight' })
  expect(setState).not.toHaveBeenCalled()
})

test('Escape clears the selection and any pending nudge', () => {
  const { state, setState, onVertexMoved } = setup()
  Object.assign(state, { selectedVertexIndex: 1, selectedVertexType: 'vertex' })
  key('keydown', { key: 'ArrowRight' })
  key('keydown', { key: 'Escape' })
  expect(setState).toHaveBeenLastCalledWith({ selectedVertexIndex: -1, selectedVertexType: null })
  key('keyup', { key: 'ArrowRight' })
  expect(onVertexMoved).not.toHaveBeenCalled()
})

test('Delete deletes, ctrl/cmd+z undoes — but not while typing in an input inside the viewport', () => {
  const { map, onDeleted, onUndo } = setup()
  key('keyup', { key: 'Delete' })
  expect(onDeleted).toHaveBeenCalled()
  key('keydown', { key: 'z', ctrlKey: true })
  expect(onUndo).toHaveBeenCalledTimes(1)

  const input = document.createElement('input')
  map.getViewport().appendChild(input)
  input.focus()
  key('keydown', { key: 'z', ctrlKey: true })
  expect(onUndo).toHaveBeenCalledTimes(1)
})

test('Alt+Enter keyup stops propagation while a vertex is selected — never reaches the app-wide "highlight label at center" shortcut', () => {
  const { state } = setup()
  state.selectedVertexIndex = 1
  const event = new KeyboardEvent('keyup', { key: 'Enter', altKey: true, cancelable: true, bubbles: true })
  const stopSpy = jest.spyOn(event, 'stopPropagation')
  window.dispatchEvent(event)
  expect(stopSpy).toHaveBeenCalled()
})

test('Alt+Arrow keyup stops propagation too, while a vertex is selected — never reaches the app-wide "highlight next label" shortcut', () => {
  const { state } = setup()
  state.selectedVertexIndex = 1
  const event = new KeyboardEvent('keyup', { key: 'ArrowRight', altKey: true, cancelable: true, bubbles: true })
  const stopSpy = jest.spyOn(event, 'stopPropagation')
  window.dispatchEvent(event)
  expect(stopSpy).toHaveBeenCalled()
})

test('leaves Alt+Enter/Alt+Arrow alone with nothing selected — no local meaning to protect, so map-label selection still works', () => {
  setup() // default state.selectedVertexIndex is -1 — nothing selected
  const enterEvent = new KeyboardEvent('keyup', { key: 'Enter', altKey: true, cancelable: true, bubbles: true })
  const arrowEvent = new KeyboardEvent('keyup', { key: 'ArrowRight', altKey: true, cancelable: true, bubbles: true })
  const enterSpy = jest.spyOn(enterEvent, 'stopPropagation')
  const arrowSpy = jest.spyOn(arrowEvent, 'stopPropagation')
  window.dispatchEvent(enterEvent)
  window.dispatchEvent(arrowEvent)
  expect(enterSpy).not.toHaveBeenCalled()
  expect(arrowSpy).not.toHaveBeenCalled()
})

test('a plain Enter keyup (no Alt) is left alone', () => {
  setup()
  const event = new KeyboardEvent('keyup', { key: 'Enter', altKey: false, cancelable: true, bubbles: true })
  const stopSpy = jest.spyOn(event, 'stopPropagation')
  window.dispatchEvent(event)
  expect(stopSpy).not.toHaveBeenCalled()
})

test('keys are ignored while an interactive element outside the viewport has focus', () => {
  const { onDeleted, onKeyboardActive } = setup()
  const button = document.createElement('button')
  document.body.appendChild(button)
  button.focus()
  key('keyup', { key: 'Delete' })
  key('keydown', { key: ' ' })
  expect(onDeleted).not.toHaveBeenCalled()
  expect(onKeyboardActive).not.toHaveBeenCalled()
})

test('keys are ignored while a tabindex-focusable non-interactive element outside the viewport has focus', () => {
  const { onDeleted } = setup()
  const div = document.createElement('div')
  div.tabIndex = 0 // focusable via tabindex, not one of the interactive tags
  document.body.appendChild(div)
  div.focus()
  key('keyup', { key: 'Delete' })
  expect(onDeleted).not.toHaveBeenCalled()
})

test('unhandled keys do nothing', () => {
  const { setState } = setup()
  key('keydown', { key: 'a' })
  expect(setState).not.toHaveBeenCalled()
})

test('destroy removes the window listeners', () => {
  const { handler, onDeleted } = setup()
  handler.destroy()
  key('keyup', { key: 'Delete' })
  expect(onDeleted).not.toHaveBeenCalled()
})

test('selection and navigation are no-ops without handles or without projectable pixels', () => {
  const { state, setState } = setup()
  state.vertices = []
  key('keydown', { key: ' ' })
  key('keydown', { key: 'ArrowUp', altKey: true })
  expect(setState).not.toHaveBeenCalled()

  const { state: s2, setState: set2, map } = setup()
  map.getPixelFromCoordinate = () => null // e.g. mid view transition
  key('keydown', { key: ' ' })
  key('keydown', { key: 'ArrowUp', altKey: true }) // no selection → start px unprojectable
  expect(set2).not.toHaveBeenCalled()
  expect(s2.selectedVertexIndex).toBe(-1)
})
