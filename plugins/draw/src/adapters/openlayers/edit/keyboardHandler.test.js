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
  liveHandlers.splice(0).forEach((h) => h.destroy())
  document.body.innerHTML = ''
})

const key = (type, props) => window.dispatchEvent(new KeyboardEvent(type, { cancelable: true, ...props }))

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
