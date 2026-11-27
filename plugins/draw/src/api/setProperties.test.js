import { setProperties } from './setProperties.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

const setup = ({ draw, mode = 'disabled', feature = null } = {}) => {
  const eventBus = { emit: jest.fn() }
  const dispatch = jest.fn()
  if (draw) { draw.getMode = jest.fn(() => mode) }
  return {
    context: { pluginState: { feature, dispatch }, mapState: { mapStyles: [{ id: 'outdoor' }, { id: 'dark' }] }, mapProvider: { draw }, services: { eventBus } },
    eventBus,
    dispatch
  }
}

const makeDraw = () => ({ get: jest.fn((id) => ({ id, properties: {} })), setProperties: jest.fn() })

beforeEach(() => jest.clearAllMocks())

describe('setProperties', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup()
    expect(setProperties(context, 'a', { name: 'x' })).toBe(false)
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('warns and does nothing for an id with no existing feature', () => {
    const draw = makeDraw()
    draw.get.mockReturnValue(undefined)
    const { context, eventBus } = setup({ draw })
    expect(setProperties(context, 'missing', { name: 'x' })).toBe(false)
    expect(draw.setProperties).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('setProperties: no feature found for id', 'missing')
  })

  test('merges the properties and reports what was applied', () => {
    const draw = makeDraw()
    const { context, eventBus, dispatch } = setup({ draw })
    expect(setProperties(context, 'a', { name: 'North field', fillType: 'arable', stroke: 'red', strokeDark: 'tan' })).toBe(true)
    expect(draw.setProperties).toHaveBeenCalledWith('a', { name: 'North field', fillType: 'arable' })
    expect(eventBus.emit).toHaveBeenCalledWith('draw:propertieschange', { featureId: 'a', properties: { name: 'North field', fillType: 'arable' } })
    expect(dispatch).not.toHaveBeenCalled()
  })

  test('defaults properties to {}', () => {
    const draw = makeDraw()
    const { context, eventBus } = setup({ draw })
    expect(setProperties(context, 'a')).toBe(true)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:propertieschange', { featureId: 'a', properties: {} })
  })

  // Otherwise Cancel would put back the edit-start copy without them
  test('also updates the edit-start copy of the feature being edited', () => {
    const draw = makeDraw()
    const editStart = { id: 'a', geometry: {}, properties: { landUse: 'arable', sortKey: 2 } }
    const { context, dispatch } = setup({ draw, mode: 'edit_vertex', feature: editStart })
    setProperties(context, 'a', { name: 'North field' })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_FEATURE',
      payload: { feature: { id: 'a', geometry: {}, properties: { landUse: 'arable', sortKey: 2, name: 'North field' } } }
    })
  })

  test('leaves the edit-start copy alone when a different feature is changed', () => {
    const draw = makeDraw()
    const { context, dispatch } = setup({ draw, mode: 'edit_vertex', feature: { id: 'b', properties: {} } })
    setProperties(context, 'a', { name: 'x' })
    expect(dispatch).not.toHaveBeenCalled()
  })
})
