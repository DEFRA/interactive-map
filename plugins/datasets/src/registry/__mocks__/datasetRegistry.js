import { mappedDatasetsReducer } from '../../reducers/mappedDatasetsReducer.js'
import { datasets as datasetDefinitions } from '../../reducers/__data__/demoDatasets.js'
import { datasets as esriDatasetDefinitions } from '../../reducers/__data__/esriDatasets.js'
const { createDatasetRegistry } = jest.requireActual('../datasetRegistry.js')
const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets: datasetDefinitions })

const globalState = {
  opacityMode: 'dataset',
  opacity: 1,
  visible: true
}

// By adding jest.mock('<path-to>/datasetRegistry.js')
// to a test file, datasetRegistry imported from that file will be a registry
// with the demo datasets attached for testing, to pass to datasets and adapters.
// If we need to test against a different set of datasets
// we can import that config from demoDatasets.js (or roll our own)
// and attach it in the specific test
const datasetRegistry = createDatasetRegistry()

beforeEach(() => {
  datasetRegistry.attach(mappedDatasets, orderedDatasets)
  datasetRegistry.attachGlobals(globalState)
})

datasetRegistry.mockExtend = (extraDatasets) => datasetRegistry.attach(
  { ...mappedDatasets, ...extraDatasets },
  [...orderedDatasets, ...Object.keys(extraDatasets)]
)

datasetRegistry.useEsriDatasets = (extraDatasets = {}) => {
  const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets: esriDatasetDefinitions })
  datasetRegistry.attach(
    { ...mappedDatasets, ...extraDatasets },
    [...orderedDatasets, ...Object.keys(extraDatasets)]
  )
}

export { datasetRegistry, createDatasetRegistry }
