import { selectFeature } from './selectFeature.js'

describe('selectFeature', () => {
  let mockEmit
  let params

  beforeEach(() => {
    mockEmit = jest.fn()
    params = {
      services: { eventBus: { emit: mockEmit } }
    }
  })

  it('emits interact:selectFeature event', () => {
    selectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:selectFeature',
      expect.any(Object)
    )
  })

  it('passes featureId to event', () => {
    selectFeature(params, { featureId: 'feature-123' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:selectFeature',
      expect.objectContaining({ featureId: 'feature-123' })
    )
  })

  it('passes layerId to event', () => {
    selectFeature(params, {
      featureId: 'f1',
      layerId: 'layer-abc'
    })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:selectFeature',
      expect.objectContaining({ layerId: 'layer-abc' })
    )
  })

  it('passes idProperty to event', () => {
    selectFeature(params, {
      featureId: 'f1',
      idProperty: 'objectId'
    })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:selectFeature',
      expect.objectContaining({ idProperty: 'objectId' })
    )
  })

  it('handles missing optional params', () => {
    selectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledWith(
      'interact:selectFeature',
      {
        featureId: 'f1',
        layerId: undefined,
        idProperty: undefined
      }
    )
  })

  it('calls emit exactly once', () => {
    selectFeature(params, { featureId: 'f1' })

    expect(mockEmit).toHaveBeenCalledTimes(1)
  })
})
