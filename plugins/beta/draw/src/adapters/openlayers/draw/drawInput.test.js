import { createDrawInput } from './drawInput.js'
import { createVertexPlacement } from './vertexPlacement.js'
import { createFakeMap, createContainer } from '../__helpers__/harness.js'

jest.mock('./vertexPlacement.js', () => ({
  createVertexPlacement: jest.fn(() => ({
    placeVertex: jest.fn(),
    updateRubberbanding: jest.fn(),
    clearLastCoord: jest.fn()
  }))
}))

const setup = (interfaceType = 'mouse') => {
  const map = createFakeMap()
  const container = createContainer()
  const button = document.createElement('button')
  button.id = 'add-pt'
  document.body.appendChild(button)
  const onUndo = jest.fn()
  const input = createDrawInput({
    drawInteraction: { getMap: () => map },
    options: { container, addVertexButtonId: 'add-pt', interfaceType, mapProvider: {}, snap: null, onUndo }
  })
  const placement = createVertexPlacement.mock.results.at(-1).value
  liveInputs.push(input)
  return { map, view: map.getView(), container, button, input, placement, onUndo }
}

const liveInputs = []
afterEach(() => {
  liveInputs.splice(0).forEach((i) => i.destroy())
  document.body.innerHTML = ''
  jest.clearAllMocks()
})

const key = (props) => window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...props }))

test('Enter places a vertex and switches to keyboard — only while focus is inside the viewport', () => {
  const { container, input, placement } = setup()
  key({ key: 'Enter' })
  expect(placement.placeVertex).not.toHaveBeenCalled()

  container.focus()
  key({ key: 'Enter' })
  expect(placement.placeVertex).toHaveBeenCalled()
  expect(input.getInterfaceType()).toBe('keyboard')
})

test('arrow keys switch to the keyboard interface without placing', () => {
  const { container, input, placement } = setup()
  container.focus()
  key({ key: 'ArrowUp' })
  expect(input.getInterfaceType()).toBe('keyboard')
  expect(placement.placeVertex).not.toHaveBeenCalled()
})

test('ctrl/cmd+z triggers undo', () => {
  const { container, onUndo } = setup()
  container.focus()
  key({ key: 'z', ctrlKey: true })
  expect(onUndo).toHaveBeenCalled()
})

test('the add-vertex button places a vertex; other clicks do not', () => {
  const { button, placement } = setup()
  button.click()
  expect(placement.placeVertex).toHaveBeenCalledTimes(1)
  document.body.click()
  expect(placement.placeVertex).toHaveBeenCalledTimes(1)
})

test('pointer and touch input switch the interface type', () => {
  const { container, input, placement } = setup('keyboard')
  container.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'mouse' }))
  expect(input.getInterfaceType()).toBe('mouse')
  expect(placement.clearLastCoord).toHaveBeenCalled()

  container.dispatchEvent(new Event('touchstart'))
  expect(input.getInterfaceType()).toBe('touch')
})

test('pointer moves and map pans update the rubber band except for the mouse interface', () => {
  const { container, view, placement } = setup('touch')
  container.dispatchEvent(new Event('pointermove'))
  view.emit('change:center')
  expect(placement.updateRubberbanding).toHaveBeenCalledTimes(2)

  const mouse = setup('mouse')
  mouse.container.dispatchEvent(new Event('pointermove'))
  mouse.view.emit('change:center')
  expect(mouse.placement.updateRubberbanding).not.toHaveBeenCalled()
})

test('keyboard pan animations keep the rubber band anchored via postrender', () => {
  const { map, view, placement } = setup('keyboard')
  view.getAnimating.mockReturnValue(true)
  map.emit('postrender')
  expect(placement.updateRubberbanding).toHaveBeenCalledTimes(1)
  view.getAnimating.mockReturnValue(false)
  map.emit('postrender')
  expect(placement.updateRubberbanding).toHaveBeenCalledTimes(1)
})

test('destroy removes all listeners', () => {
  const { container, button, input, placement } = setup()
  input.destroy()
  container.focus()
  key({ key: 'Enter' })
  button.click()
  expect(placement.placeVertex).not.toHaveBeenCalled()
})
