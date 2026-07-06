import { addFeature } from './addFeature.js'
import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

jest.mock('../utils/flattenStyleProperties.js', () => ({
  flattenStyleProperties: jest.fn(() => ({ _flat: true }))
}))

const setup = (draw) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapProvider: { draw }, services: { eventBus } }, eventBus }
}

beforeEach(() => jest.clearAllMocks())

describe('addFeature', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup(undefined)
    addFeature(context, { id: 'a' })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('flattens style properties and adds the feature', () => {
    const draw = { add: jest.fn() }
    const { context, eventBus } = setup(draw)
    const feature = { id: 'a', geometry: {}, stroke: 'red', fill: 'blue', strokeWidth: 2, properties: { name: 'x' } }

    addFeature(context, feature)

    expect(flattenStyleProperties).toHaveBeenCalledWith({ stroke: 'red', fill: 'blue', strokeWidth: 2 })
    const expected = { id: 'a', geometry: {}, properties: { name: 'x', _flat: true } }
    expect(draw.add).toHaveBeenCalledWith(expected)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:add', expected)
  })

  test('handles a feature without existing properties', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    addFeature(context, { id: 'b', geometry: {} })
    expect(draw.add).toHaveBeenCalledWith({ id: 'b', geometry: {}, properties: { _flat: true } })
  })
})
