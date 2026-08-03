import {
  datasets, expectedDatasetsMenuConfig,
  datasetsWithGroups, expectedDatasetsMenuConfigWithGroups
} from './__data__/demoDatasets.js'

import { datasetsToMenu } from './datasetsToMenu'

describe('datasetsToMenu', () => {
  describe('Missing or empty datasets', () => {
    it('handles empty datasets', async () => {
      expect(datasetsToMenu({ datasets: [] }))
        .toEqual([])
    })

    it('handles missing datasets', async () => {
      expect(datasetsToMenu({}))
        .toEqual([])
    })
  })

  describe('Datasets without groups', () => {
    it('transforms datasets to menu config', async () => {
      expect(datasetsToMenu({ datasets }))
        .toEqual(expectedDatasetsMenuConfig)
    })
  })

  describe('Datasets with groups', () => {
    it('transforms datasets with groups to menu config', async () => {
      const datasetsWithGroupsMenuConfig = datasetsToMenu({ datasets: datasetsWithGroups })
      expect(datasetsWithGroupsMenuConfig)
        .toEqual(expectedDatasetsMenuConfigWithGroups)
    })
  })

  describe('showInMenu inheritance for sublayers', () => {
    const sublayerDataset = (datasetShowInMenu, sublayerShowInMenu) => ({
      id: 'test',
      label: 'Test',
      showInMenu: datasetShowInMenu,
      sublayers: [
        { id: 'a', label: 'A', ...(sublayerShowInMenu !== undefined && { showInMenu: sublayerShowInMenu }) },
        { id: 'b', label: 'B', ...(sublayerShowInMenu !== undefined && { showInMenu: sublayerShowInMenu }) }
      ]
    })

    it('sublayers inherit showInMenu: true from the dataset when not explicitly set', () => {
      const result = datasetsToMenu({ datasets: [sublayerDataset(true, undefined)] })
      expect(result[0].items).toHaveLength(2)
    })

    it('sublayer can opt out with showInMenu: false when dataset has showInMenu: true', () => {
      const dataset = {
        id: 'test',
        label: 'Test',
        showInMenu: true,
        sublayers: [
          { id: 'a', label: 'A', showInMenu: false },
          { id: 'b', label: 'B' }
        ]
      }
      const result = datasetsToMenu({ datasets: [dataset] })
      expect(result[0].items).toEqual([{ id: 'test-b', label: 'B' }])
    })

    it('sublayers with showInMenu: true appear when dataset does not have showInMenu set', () => {
      const dataset = {
        id: 'test',
        label: 'Test',
        sublayers: [
          { id: 'a', label: 'A', showInMenu: true },
          { id: 'b', label: 'B' }
        ]
      }
      const result = datasetsToMenu({ datasets: [dataset] })
      expect(result[0].items).toEqual([{ id: 'test-a', label: 'A' }])
    })

    it('Should have a single menu entry for the parent dataset when showInMenu: true but all sublayers opt out', () => {
      const result = datasetsToMenu({ datasets: [sublayerDataset(true, false)] })
      expect(result).toEqual([{ id: 'test', items: [{ id: 'test', label: 'Test' }], type: 'checkbox', visibleWhen: true }])
    })
  })
})
