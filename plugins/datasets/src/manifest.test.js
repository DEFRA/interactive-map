import { manifest } from './manifest.js'

jest.mock('./reducers/pluginState.js', () => ({ initialState: {}, actions: {} }))
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

  it('has an api with all expected methods', () => {
    expect(manifest.api.addDataset).toBeDefined()
    expect(manifest.api.removeDataset).toBeDefined()
    expect(manifest.api.setDatasetVisibility).toBeDefined()
    expect(manifest.api.setOpacity).toBeDefined()
    expect(manifest.api.getOpacity).toBeDefined()
  })
})
