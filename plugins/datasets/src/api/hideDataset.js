export const hideDataset = ({ mapProvider, pluginState }, datasetId) => {
  const map = mapProvider.map

  // Update map layer visibility
  if (map.getLayer(datasetId)) {
    map.setLayoutProperty(datasetId, 'visibility', 'none')
  }
  if (map.getLayer(`${datasetId}-stroke`)) {
    map.setLayoutProperty(`${datasetId}-stroke`, 'visibility', 'none')
  }

  // Update state
  pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { id: datasetId, visibility: 'hidden' } })
}