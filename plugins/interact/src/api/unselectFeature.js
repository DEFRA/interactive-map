/**
 * Programmatically unselect a feature.
 *
 * @param {{ services: { eventBus: { emit: Function } } }} params
 * @param {{ featureId: string, layerId?: string, idProperty?: string }} featureInfo
 */
export const unselectFeature = ({ services }, { featureId, layerId, idProperty }) => {
  services.eventBus.emit('interact:unselectFeature', {
		featureId,
		layerId,
		idProperty
	})
}