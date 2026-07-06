import { createTouchHandler } from './touchHandler.js'
import { createFakeMap, createContainer, polygonFeature, domEvent } from '../__helpers__/harness.js'

const RING = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]

// Guard-path tests only — the happy touch-drag and tap flows are covered through EditMode
const setup = (stateOverrides = {}) => {
  const map = createFakeMap()
  const container = createContainer()
  const state = {
    olFeature: polygonFeature(RING),
    selectedVertexIndex: 1,
    selectedVertexType: 'vertex',
    vertices: [[0, 0], [100, 0], [100, 100], [0, 100]],
    midpoints: [],
    interfaceType: 'touch',
    ...stateOverrides
  }
  const setState = jest.fn((updates) => Object.assign(state, updates))
  const onVertexMoved = jest.fn()
  const onTap = jest.fn()
  const handler = createTouchHandler({ map, container, getState: () => state, setState, onVertexMoved, onTap, colors: {}, snap: null })
  const grip = container.querySelector('[data-im-draw-touch-target] circle')
  const touch = (type, x, y) => grip.dispatchEvent(domEvent(type, {
    touches: [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }]
  }))
  return { map, container, state, handler, onVertexMoved, onTap, touch, grip }
}

afterEach(() => { document.body.innerHTML = '' })

test('touching the target with nothing selected starts neither a drag nor a tap', () => {
  const { state, handler, touch, onVertexMoved, onTap } = setup({ selectedVertexIndex: -1 })
  touch('touchstart', 100, 0)
  touch('touchmove', 120, 10)
  touch('touchend', 120, 10)
  expect(onVertexMoved).not.toHaveBeenCalled()
  expect(onTap).not.toHaveBeenCalled() // target touches never count as taps
  expect(state.olFeature.getGeometry().getCoordinates()[0]).toEqual(RING)
  handler.destroy()
})

test('a stray touchmove without an active drag is ignored', () => {
  const { state, handler, touch } = setup()
  touch('touchmove', 120, 10)
  expect(state.olFeature.getGeometry().getCoordinates()[0]).toEqual(RING)
  handler.destroy()
})

test('a drag halts safely if the feature disappears mid-gesture', () => {
  const { state, handler, touch } = setup()
  handler.updateTargetPosition() // target visible over vertex 1
  touch('touchstart', 100, 0)
  const feature = state.olFeature
  state.olFeature = null
  touch('touchmove', 120, 10)
  expect(feature.getGeometry().getCoordinates()[0]).toEqual(RING)
  handler.destroy()
})

test('the offset target hides when its vertex cannot be projected', () => {
  const { map, container, handler } = setup()
  handler.updateTargetPosition()
  const target = container.querySelector('[data-im-draw-touch-target]')
  expect(target.style.display).toBe('block')
  map.getPixelFromCoordinate = () => null // e.g. mid view transition
  handler.updateTargetPosition()
  expect(target.style.display).toBe('none')
  handler.destroy()
})
