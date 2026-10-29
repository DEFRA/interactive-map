import { mergeFeatureProperties } from './mergeFeatureProperties.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

beforeEach(() => jest.clearAllMocks())

describe('mergeFeatureProperties', () => {
  test('writes the properties to the feature, leaving out undefined and keeping null', () => {
    const draw = { setProperties: jest.fn() }
    const applied = mergeFeatureProperties(draw, 'a', { name: 'North field', ref: null, note: undefined }, { caller: 'setProperties' })
    expect(draw.setProperties).toHaveBeenCalledWith('a', { name: 'North field', ref: null })
    expect(applied).toEqual({ name: 'North field', ref: null })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('refuses internal and style properties with a warning, applying the rest', () => {
    const draw = { setProperties: jest.fn() }
    const applied = mergeFeatureProperties(draw, 'a', {
      name: 'x', fillType: 'arable', sortKey: 3, symbolImageId: 'img', stroke: 'red', strokeDark: 'tan', strokeWidth: 2, symbol: 'pin'
    }, { caller: 'onGeometryFinish', styleIds: ['outdoor', 'dark'] })
    expect(applied).toEqual({ name: 'x', fillType: 'arable' })
    expect(draw.setProperties).toHaveBeenCalledWith('a', { name: 'x', fillType: 'arable' })
    expect(logger.warn).toHaveBeenCalledWith(
      'onGeometryFinish: ignoring internal and style properties — use setStyle for style',
      ['sortKey', 'symbolImageId', 'stroke', 'strokeDark', 'strokeWidth', 'symbol']
    )
  })

  test('writes nothing when no property is left to apply', () => {
    const draw = { setProperties: jest.fn() }
    expect(mergeFeatureProperties(draw, 'a', { stroke: 'red' }, { caller: 'setProperties' })).toEqual({})
    expect(mergeFeatureProperties(draw, 'a', undefined, { caller: 'setProperties' })).toEqual({})
    expect(draw.setProperties).not.toHaveBeenCalled()
  })
})
