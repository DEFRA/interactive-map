import { mappedDatasetsReducer } from '../../reducers/mappedDatasetsReducer.js'
import { datasets as datasetDefinitions } from '../../reducers/__data__/demoDatasets.js'
import { datasets as esriDatasetDefinitions } from '../../reducers/__data__/esriDatasets.js'
import { attachGlobalState } from '../globalDataset.js'
const { datasetRegistry } = jest.requireActual('../datasetRegistry.js')
const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets: datasetDefinitions })

const globalState = {
  opacityMode: 'dataset',
  opacity: 1,
  visible: true
}

// By adding jest.mock('<path-to>/datasetRegistry.js')
// to a test file, any import of datasetRegistry from that file will get this
// version with the demo datasets attached for testing.
// If we need to test against a different set of datasets
// we can import that config from demoDatasets.js (or roll our own)
// and attach it in the specific test
beforeEach(() => {
  datasetRegistry.attach(mappedDatasets, orderedDatasets)
  attachGlobalState(globalState)
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

export { datasetRegistry }
