export class DatasetDefinitionCache {
  constructor () {
    this.idToDefinitionMap = new Map()
    this.definitionToInstanceMap = new Map()
  }

  add (registryDataset) {
    this.idToDefinitionMap.set(registryDataset.id, registryDataset._datasetDefinition)
    this.definitionToInstanceMap.set(registryDataset._datasetDefinition, registryDataset)
  }

  invalidateDataset (registryDataset) {
    const existingDefinition = this.idToDefinitionMap.get(registryDataset.id)
    const allIds = [existingDefinition.id, ...(existingDefinition?.sublayerIds || [])]
    allIds.forEach(id => {
      const definition = this.idToDefinitionMap.get(id)
      this.definitionToInstanceMap.delete(definition)
      this.idToDefinitionMap.delete(id)
    })
  }

  invalidateChangedDatasets (newDatasets) {
    newDatasets.forEach((datasetDefinition) => {
      const existingDefinition = this.idToDefinitionMap.get(datasetDefinition.id)
      if (existingDefinition && existingDefinition !== datasetDefinition) {
        const instance = this.definitionToInstanceMap.get(existingDefinition)
        this.invalidateDataset(instance.isSublayer && instance.parent ? instance.parent : instance)
      }
    })
  }

  getByDefinition (datasetDefinition) {
    return this.definitionToInstanceMap.get(datasetDefinition)
  }
}
