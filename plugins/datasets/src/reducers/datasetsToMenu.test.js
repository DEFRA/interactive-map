import {
  datasets, expectedDatasetsMenuConfig,
  datasetsWithGroups, expectedDatasetsMenuConfigWithGroups
} from './__data__/demoDatasets.js'

import { datasetsToMenu, addDatasetToMenu, removeDatasetsFromMenu } from './datasetsToMenu'

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

    it('skips a parent with showInMenu:false when no sublayers are visible', () => {
      // Contrived: a getter that returns true on the first access (outer filter's `some`)
      // and false on subsequent accesses (inner filter), hitting the early-return guard.
      let calls = 0
      const dataset = {
        id: 'tricky',
        label: 'Tricky',
        showInMenu: false,
        sublayers: [{ id: 'tricky-a', label: 'A', get showInMenu () { return calls++ === 0 } }]
      }
      const result = datasetsToMenu({ datasets: [dataset] })
      expect(result).toEqual([])
    })
  })
})

describe('addDatasetToMenu', () => {
  it('appends to an existing menu group with matching groupLabel', () => {
    const state = {
      menu: [{ id: 'Layers', groupLabel: 'Layers', type: 'checkbox', visibleWhen: true, items: [{ id: 'roads', label: 'Roads' }] }]
    }
    const dataset = { id: 'rivers', label: 'Rivers', showInMenu: true, groupLabel: 'Layers' }
    const result = addDatasetToMenu(state, dataset)
    expect(result[0].items).toHaveLength(2)
    expect(result[0].items[1]).toEqual({ id: 'rivers', label: 'Rivers' })
  })

  it('pushes a new group when no matching groupLabel exists', () => {
    const state = { menu: [] }
    const dataset = { id: 'parks', label: 'Parks', showInMenu: true }
    const result = addDatasetToMenu(state, dataset)
    expect(result).toHaveLength(1)
    expect(result[0].items[0].id).toBe('parks')
  })
})

describe('removeDatasetsFromMenu', () => {
  it('keeps groups that still have items after filtering', () => {
    const menu = [
      { id: 'Layers', items: [{ id: 'roads' }, { id: 'rivers' }] }
    ]
    const result = removeDatasetsFromMenu(menu, ['roads'])
    expect(result).toHaveLength(1)
    expect(result[0].items).toEqual([{ id: 'rivers' }])
  })

  it('removes groups that are left with no items', () => {
    const menu = [
      { id: 'Layers', items: [{ id: 'roads' }] }
    ]
    const result = removeDatasetsFromMenu(menu, ['roads'])
    expect(result).toHaveLength(0)
  })
})
