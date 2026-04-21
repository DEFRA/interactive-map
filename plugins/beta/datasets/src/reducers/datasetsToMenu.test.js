import { datasets, expectedMenuConfig } from './__data__/demoDatasets'
import { datasetsToMenu } from './datasetsToMenu'

describe('datasetsToMenu', () => {
  it('transforms datasets to menu config', async () => {
    expect(datasetsToMenu({ datasets }))
      .toEqual(expectedMenuConfig)
  })

  it('handles empty datasets', async () => {
    expect(datasetsToMenu({ datasets: [] }))
      .toEqual([])
  })

  it('handles missing datasets', async () => {
    expect(datasetsToMenu({}))
      .toEqual([])
  })
})
