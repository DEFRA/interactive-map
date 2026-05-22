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
})
