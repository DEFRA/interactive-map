import { applyDatasetDefaultsWithoutFlattening } from '../initialise/defaults.js'

const flattenSublayer = (parentId, sublayer) => {
  const id = `${parentId}-${sublayer.id}`
  const sublayerId = sublayer.id
  if (sublayer.visibility !== 'hidden') {
    sublayer.visibility = 'visible'
  }
  return { ...sublayer, id, parentId, sublayerId }
}

const reduceDatasets = (acc, dataset) => {
  const { id } = dataset
  acc[id] = applyDatasetDefaultsWithoutFlattening(dataset)
  const { orderedDatasets } = acc
  orderedDatasets.push(id)
  const flattenedSublayers = dataset.sublayers?.map((sublayer) => flattenSublayer(id, sublayer))
  if (flattenedSublayers?.length) {
    const sublayerIds = flattenedSublayers?.map(sublayer => sublayer.id)
    const sublayers = flattenedSublayers?.reduce(reduceDatasets, { orderedDatasets })
    acc[id].sublayerIds = sublayerIds
    delete acc[id].sublayers
    return { ...acc, ...sublayers, orderedDatasets }
  }
  return { ...acc, orderedDatasets }
}

export const mappedDatasetsReducer = (state) => {
  const datasets = state.datasets || []
  const mappedDatasets = datasets.reduce(reduceDatasets, { orderedDatasets: [] })
  const { orderedDatasets } = mappedDatasets
  delete mappedDatasets.orderedDatasets
  return { ...state, mappedDatasets, orderedDatasets }
}
