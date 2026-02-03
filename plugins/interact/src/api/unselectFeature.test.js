import { unselectFeature } from './unselectFeature.js'

describe('unselectFeature', () => {
  it('emits interact:unselectFeature with correct payload', () => {
    const emit = jest.fn()
    const services = { eventBus: { emit } }

    // Test with all params
    unselectFeature(
      { services },
      { featureId: 'f1', layerId: 'layer-abc', idProperty: 'objectId' }
    )

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('interact:unselectFeature', {
      featureId: 'f1',
      layerId: 'layer-abc',
      idProperty: 'objectId'
    })

    emit.mockClear()

    // Test missing optional params
    unselectFeature({ services }, { featureId: 'f2' })

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('interact:unselectFeature', {
      featureId: 'f2',
      layerId: undefined,
      idProperty: undefined
    })
  })
})
