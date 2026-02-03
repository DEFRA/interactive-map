import { selectFeature } from './selectFeature.js'

describe('selectFeature', () => {
  it('emits interact:selectFeature with correct payload', () => {
    const emit = jest.fn()
    const services = { eventBus: { emit } }

    // Test with all params
    selectFeature(
      { services },
      { featureId: 'f1', layerId: 'layer-abc', idProperty: 'objectId' }
    )

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('interact:selectFeature', {
      featureId: 'f1',
      layerId: 'layer-abc',
      idProperty: 'objectId'
    })

    emit.mockClear()

    // Test missing optional params
    selectFeature({ services }, { featureId: 'f2' })

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('interact:selectFeature', {
      featureId: 'f2',
      layerId: undefined,
      idProperty: undefined
    })
  })
})
