export const addDataset = ({ pluginState: { dispatch }, mapState }, dataset) => {
  dispatch({ type: 'ADD_DATASET', payload: { dataset, mapStyle: mapState.mapStyle } })
}
