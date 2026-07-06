import { createPointerHandlers } from './pointerHandlers.js'
import { createFakeMap, createContainer, domEvent } from '../__helpers__/harness.js'

const setup = (interfaceType = 'mouse') => {
  const map = createFakeMap()
  const container = createContainer()
  const button = document.createElement('button')
  button.id = 'delete-vertex'
  document.body.appendChild(button)
  const state = { interfaceType, vertices: [[10, 10]], midpoints: [[50, 50]] }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const touchHandler = { updateTargetPosition: jest.fn(), hide: jest.fn() }
  const onDeleteVertex = jest.fn()
  const handlers = createPointerHandlers({
    map, container, getState: () => state, setState, touchHandler, deleteVertexButtonId: 'delete-vertex', onDeleteVertex
  })
  return { container, button, state, setState, touchHandler, onDeleteVertex, handlers }
}

afterEach(() => { document.body.innerHTML = '' })

const pointer = (type, pointerType, x = 0, y = 0) => domEvent(type, { pointerType, clientX: x, clientY: y })

test('touch pointerdown switches to touch interface and repositions the touch target', () => {
  const { container, state, touchHandler, setState } = setup()
  container.dispatchEvent(pointer('pointerdown', 'touch'))
  expect(state.interfaceType).toBe('touch')
  expect(touchHandler.updateTargetPosition).toHaveBeenCalled()
  expect(setState).not.toHaveBeenCalled() // device switch must not touch the selection
})

test('mouse pointerdown selects a vertex under the pointer, but nothing elsewhere', () => {
  const { container, state, setState } = setup('touch')
  container.dispatchEvent(pointer('pointerdown', 'mouse', 11, 11))
  expect(state.interfaceType).toBe('mouse')
  expect(setState).toHaveBeenCalledWith({ selectedVertexIndex: 0, selectedVertexType: 'vertex' })
  setState.mockClear()
  container.dispatchEvent(pointer('pointerdown', 'mouse', 200, 200))
  expect(setState).not.toHaveBeenCalled()
})

test('click selects a vertex, deselects on empty map, leaves midpoints to Modify, and ignores touch', () => {
  const { container, state, setState } = setup()
  container.dispatchEvent(pointer('click', 'mouse', 11, 11))
  expect(setState).toHaveBeenCalledWith({ selectedVertexIndex: 0, selectedVertexType: 'vertex' })
  container.dispatchEvent(pointer('click', 'mouse', 51, 49))
  expect(setState).toHaveBeenCalledTimes(1) // midpoint click: modifyend already handled selection
  container.dispatchEvent(pointer('click', 'mouse', 200, 200))
  expect(setState).toHaveBeenLastCalledWith({ selectedVertexIndex: -1, selectedVertexType: null })

  state.interfaceType = 'touch'
  setState.mockClear()
  container.dispatchEvent(pointer('click', 'mouse', 11, 11))
  expect(setState).not.toHaveBeenCalled()
})

test('mouse movement switches the interface back to mouse and hides the touch target once', () => {
  const { container, state, touchHandler } = setup('touch')
  container.dispatchEvent(pointer('pointermove', 'pen'))
  expect(state.interfaceType).toBe('touch')
  container.dispatchEvent(pointer('pointermove', 'mouse'))
  expect(state.interfaceType).toBe('mouse')
  container.dispatchEvent(pointer('pointermove', 'mouse'))
  expect(touchHandler.hide).toHaveBeenCalledTimes(1)
})

test('the delete-vertex button triggers deletion; other clicks and destroy() do not', () => {
  const { button, container, onDeleteVertex, handlers } = setup()
  button.dispatchEvent(domEvent('click', {}))
  expect(onDeleteVertex).toHaveBeenCalledTimes(1)
  document.body.dispatchEvent(domEvent('click', {}))
  expect(onDeleteVertex).toHaveBeenCalledTimes(1)

  handlers.destroy()
  button.dispatchEvent(domEvent('click', {}))
  container.dispatchEvent(pointer('pointerdown', 'touch'))
  expect(onDeleteVertex).toHaveBeenCalledTimes(1)
})
