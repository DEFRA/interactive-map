import { mappedDatasetsReducer } from '../../reducers/mappedDatasetsReducer.js'
import { datasets as datasetDefinitions } from '../../reducers/__data__/demoDatasets.js'
const { datasetRegistry } = jest.requireActual('../datasetRegistry.js')
const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets: datasetDefinitions })

// By adding jest.mock('<path-to>/datasetRegistry.js')
// to a test file, any import of datasetRegistry from that file will get this
// version with the demo datasets attached for testing.
// If we need to test against a different set of datasets
// we can import that config from demoDatasets.js (or roll our own)
// and attach it in the specific test
beforeEach(() => {
  datasetRegistry.attach(mappedDatasets, orderedDatasets)
})

datasetRegistry.mockExtend = (extraDatasets) => datasetRegistry.attach(
  { ...mappedDatasets, ...extraDatasets },
  [...orderedDatasets, ...Object.keys(extraDatasets)]
)

export { datasetRegistry }
