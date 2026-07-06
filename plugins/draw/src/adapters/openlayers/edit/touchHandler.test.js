import { createTouchHandler } from './touchHandler.js'
import { createFakeMap, createContainer, polygonFeature, domEvent } from '../__helpers__/harness.js'

const RING = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]

// Guard-path tests only — the happy touch-drag and tap flows are covered through EditMode
const setup = (stateOverrides = {}, { snap = null } = {}) => {
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
  const handler = createTouchHandler({ map, container, getState: () => state, setState, onVertexMoved, onTap, colors: {}, snap })
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

test('a drag applies snapping to the moved coordinate when a snap manager is active', () => {
  const snap = { apply: jest.fn((c) => [c[0] + 5, c[1]]), hideIndicator: jest.fn() }
  const { state, handler, touch } = setup({}, { snap })
  handler.updateTargetPosition()
  touch('touchstart', 100, 0)
  touch('touchmove', 120, 10)
  expect(snap.apply).toHaveBeenCalled()
  expect(snap.hideIndicator).toHaveBeenCalled()
  expect(state.vertices[1]).toEqual([125, 10]) // dragged to [120,10] then snapped +5 on x
  handler.destroy()
})

test('a touch that drifts too far before lifting is not treated as a tap', () => {
  const { container, handler, onTap } = setup({ selectedVertexIndex: -1 })
  container.dispatchEvent(domEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 }] }))
  container.dispatchEvent(domEvent('touchend', { changedTouches: [{ clientX: 60, clientY: 60 }] })) // moved past the tap threshold
  expect(onTap).not.toHaveBeenCalled()
  handler.destroy()
})

test('a drag that ends after its vertex has vanished commits nothing', () => {
  const { state, handler, touch, onVertexMoved } = setup()
  handler.updateTargetPosition()
  touch('touchstart', 100, 0)
  touch('touchmove', 120, 10)
  state.vertices = [] // the vertex is gone by the time the finger lifts
  touch('touchend', 120, 10)
  expect(onVertexMoved).not.toHaveBeenCalled()
  handler.destroy()
})

test('a postrender with nothing selected leaves the target hidden', () => {
  const { map, container, handler } = setup({ selectedVertexIndex: -1 })
  const target = container.querySelector('[data-im-draw-touch-target]')
  map.emit('postrender')
  expect(target.style.display).toBe('none')
  handler.destroy()
})

test('the CSS transform reflects a scaled viewport when element widths are measurable', () => {
  const map = createFakeMap()
  const container = createContainer()
  const vp = map.getViewport()
  Object.defineProperty(vp, 'offsetWidth', { value: 200, configurable: true })
  Object.defineProperty(container, 'offsetWidth', { value: 100, configurable: true })
  vp.getBoundingClientRect = () => ({ width: 300, height: 300, left: 0, top: 0 })
  container.getBoundingClientRect = () => ({ width: 100, height: 100, left: 0, top: 0 })
  const state = {
    olFeature: polygonFeature(RING),
    selectedVertexIndex: 1,
    selectedVertexType: 'vertex',
    vertices: [[0, 0], [100, 0], [100, 100], [0, 100]],
    midpoints: [],
    interfaceType: 'touch'
  }
  const handler = createTouchHandler({ map, container, getState: () => state, setState: jest.fn(), onVertexMoved: jest.fn(), onTap: jest.fn(), colors: {}, snap: null })
  handler.updateTargetPosition() // vertex [100,0] -> pixel {100,0} -> scale 1.5 -> css left 150px
  const target = container.querySelector('[data-im-draw-touch-target]')
  expect(target.style.left).toBe('150px')
  handler.destroy()
})
