import { hasLayersMenu } from './hasLayersMenu.js'

const dataset = { id: 'roads', label: 'Roads', showInMenu: true }
const menu = [{ id: 'roads', items: [{ id: 'roads' }] }]
const loading = { menu: [], menuInitialised: false }

describe('hasLayersMenu', () => {
  it.each([
    ['no configured datasets', {}, false],
    ['datasets without showInMenu', { datasets: [{ id: 'roads' }] }, false],
    ['a configured menu dataset', { datasets: [dataset] }, true],
    ['a configured menu sublayer', { datasets: [{ id: 'parent', sublayers: [dataset] }] }, true],
    ['an explicitly disabled menu', { hasMenu: false, datasets: [dataset] }, false]
  ])('uses the configuration before the menu has loaded: %s', (_, pluginConfig, expected) => {
    expect(hasLayersMenu({ pluginConfig, pluginState: loading })).toBe(expected)
  })

  it.each([
    ['an empty live menu', { datasets: [dataset] }, [], false],
    ['a populated live menu', { datasets: [] }, menu, true],
    ['an explicitly disabled menu', { hasMenu: false }, menu, false]
  ])('uses the live menu once it has loaded: %s', (_, pluginConfig, liveMenu, expected) => {
    expect(hasLayersMenu({ pluginConfig, pluginState: { menu: liveMenu, menuInitialised: true } })).toBe(expected)
  })
})
