export const addDataset = ({ pluginState, mapState }, dataset) => {
  pluginState.dispatch({ type: 'ADD_DATASET', payload: { dataset, mapStyle: mapState.mapStyle } })
}
