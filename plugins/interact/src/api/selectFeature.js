/**
 * Programmatically select a feature.
 *
 * @param {{ services: { eventBus: { emit: Function } } }} params
 * @param {{ featureId: string, layerId?: string, idProperty?: string }} featureInfo
 */
export const selectFeature = ({ services }, { featureId, layerId, idProperty }) => {
  services.eventBus.emit('interact:selectFeature', {
		featureId,
		layerId,
		idProperty
	})
}
