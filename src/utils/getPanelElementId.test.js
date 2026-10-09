import { getPanelElementId } from './getPanelElementId.js'

describe('getPanelElementId', () => {
  it('builds the id from the idPrefix and kebab-cased panelId', () => {
    expect(getPanelElementId('prefix', 'Settings')).toBe('prefix-panel-settings')
  })

  it('kebab-cases a camelCase panelId', () => {
    expect(getPanelElementId('map1', 'layerOptions')).toBe('map1-panel-layer-options')
  })
})
