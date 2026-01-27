import { unselectFeature } from './unselectFeature.js'

describe('unselectFeature', () => {
  let mockEmit
  let params

  beforeEach(() => {
    mockEmit = jest.fn()
    params = {
      services: { eventBus: { emit: mockEmit } }
    }
  })

  it('emits interact:unselectFeature event', () => {
    unselectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:unselectFeature',
      expect.any(Object)
    )
  })

  it('passes featureId to event', () => {
    unselectFeature(params, { featureId: 'feature-123' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:unselectFeature',
      expect.objectContaining({ featureId: 'feature-123' })
    )
  })

  it('passes layerId to event', () => {
    unselectFeature(params, {
      featureId: 'f1',
      layerId: 'layer-abc'
    })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:unselectFeature',
      expect.objectContaining({ layerId: 'layer-abc' })
    )
  })

  it('passes idProperty to event', () => {
    unselectFeature(params, {
      featureId: 'f1',
      idProperty: 'objectId'
    })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:unselectFeature',
      expect.objectContaining({ idProperty: 'objectId' })
    )
  })

  it('handles missing optional params', () => {
    unselectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:unselectFeature',
      {
        featureId: 'f1',
        layerId: undefined,
        idProperty: undefined
      }
    )
  })

  it('calls emit exactly once', () => {
    unselectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledTimes(1)
  })
})
