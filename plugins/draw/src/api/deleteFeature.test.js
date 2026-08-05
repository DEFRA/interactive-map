import { deleteFeature } from './deleteFeature.js'

const setup = (draw) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapProvider: { draw }, services: { eventBus } }, eventBus }
}

describe('deleteFeature', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup(undefined)
    deleteFeature(context, 'id1')
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('deletes the feature and emits the delete event', () => {
    const draw = { delete: jest.fn() }
    const { context, eventBus } = setup(draw)

    deleteFeature(context, 'id1')

    expect(draw.delete).toHaveBeenCalledWith('id1')
    expect(eventBus.emit).toHaveBeenCalledWith('draw:delete', { featureId: 'id1' })
  })
})
