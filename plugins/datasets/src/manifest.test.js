import { manifest } from './manifest.js'

jest.mock('./initialise/DatasetsInit.jsx', () => ({ DatasetsInit: jest.fn() }))
jest.mock('./components/LayersMenu/LayersMenu.jsx', () => ({ LayersMenu: jest.fn() }))
jest.mock('./api/addDataset.js', () => ({ addDataset: jest.fn() }))
jest.mock('./api/removeDataset.js', () => ({ removeDataset: jest.fn() }))
jest.mock('./api/setDatasetVisibility.js', () => ({ setDatasetVisibility: jest.fn() }))
jest.mock('./api/setFeatureVisibility.js', () => ({ setFeatureVisibility: jest.fn() }))
jest.mock('./api/setStyle.js', () => ({ setStyle: jest.fn() }))
jest.mock('./api/getStyle.js', () => ({ getStyle: jest.fn() }))
jest.mock('./api/setOpacity.js', () => ({ setOpacity: jest.fn() }))
jest.mock('./api/getOpacity.js', () => ({ getOpacity: jest.fn() }))
jest.mock('./api/setData.js', () => ({ setData: jest.fn() }))
jest.mock('./api/setGlobals.js', () => ({ setGlobals: jest.fn() }))

describe('manifest', () => {
  it('exports a manifest object', () => {
    expect(manifest).toBeDefined()
    expect(typeof manifest).toBe('object')
  })

  it('has an InitComponent', () => {
    expect(manifest.InitComponent).toBeDefined()
  })

  it('has a reducer with initialState and actions', () => {
    expect(manifest.reducer).toBeDefined()
    expect(manifest.reducer.initialState).toBeDefined()
    expect(manifest.reducer.actions).toBeDefined()
  })

  it('has panels with a datasetsLayers panel', () => {
    expect(Array.isArray(manifest.panels)).toBe(true)
    expect(manifest.panels.find(p => p.id === 'datasetsLayers')).toBeDefined()
  })

  it('has a buttons array', () => {
    expect(Array.isArray(manifest.buttons)).toBe(true)
  })

  describe('Layers button availability', () => {
    const button = manifest.buttons.find(button => button.id === 'datasetsLayers')
    const { initialState, actions } = manifest.reducer
    const dataset = { id: 'roads', label: 'Roads', showInMenu: true }
    const menu = [{ id: 'roads', items: [{ id: 'roads' }] }]

    it.each([
      ['no configured datasets', {}, true],
      ['datasets without showInMenu', { datasets: [{ id: 'roads' }] }, true],
      ['a configured menu dataset', { datasets: [dataset] }, false],
      ['a configured menu sublayer', { datasets: [{ id: 'parent', sublayers: [dataset] }] }, false],
      ['an explicitly disabled menu', { hasMenu: false, datasets: [dataset] }, true]
    ])('uses configuration before loading: %s', (_, pluginConfig, excluded) => {
      expect(button.excludeWhen({ pluginConfig, pluginState: initialState })).toBe(excluded)
    })

    it.each([
      ['empty live menu', { datasets: [dataset] }, [], true],
      ['populated live menu', { datasets: [] }, menu, false],
      ['explicitly disabled menu', { hasMenu: false }, menu, true]
    ])('uses the live menu after loading: %s', (_, pluginConfig, menu, excluded) => {
      const pluginState = actions.SET_MENU(initialState, { menu })
      expect(button.excludeWhen({ pluginConfig, pluginState })).toBe(excluded)
    })

    it('follows runtime additions, removal of the last dataset, and re-addition', () => {
      const pluginConfig = { datasets: [dataset] }
      let pluginState = actions.SET_MENU(initialState, { menu: [] })
      pluginState = actions.ADD_DATASET(pluginState, { dataset })
      expect(button.excludeWhen({ pluginConfig, pluginState })).toBe(false)

      pluginState = actions.REMOVE_DATASET(pluginState, { id: dataset.id })
      expect(button.excludeWhen({ pluginConfig, pluginState })).toBe(true)

      pluginState = actions.ADD_DATASET(pluginState, { dataset })
      expect(button.excludeWhen({ pluginConfig, pluginState })).toBe(false)
    })
  })

  it('has an api with all expected methods', () => {
    expect(manifest.api.addDataset).toBeDefined()
    expect(manifest.api.removeDataset).toBeDefined()
    expect(manifest.api.setDatasetVisibility).toBeDefined()
    expect(manifest.api.setOpacity).toBeDefined()
    expect(manifest.api.getOpacity).toBeDefined()
  })
})
