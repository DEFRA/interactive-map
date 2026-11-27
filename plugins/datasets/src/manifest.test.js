import { createManifest } from './manifest.js'
import { hasLayersMenu } from './utils/hasLayersMenu.js'

jest.mock('./reducers/pluginState.js', () => ({ initialState: { menu: [] }, actions: {} }))
jest.mock('./registry/datasetRegistry.js', () => ({ createDatasetRegistry: jest.fn(() => ({})) }))
jest.mock('./utils/hasLayersMenu.js', () => ({ hasLayersMenu: jest.fn() }))
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

describe('createManifest', () => {
  const manifest = createManifest()

  it('returns a manifest object', () => {
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

  it('adds a dataset registry to the initial state', () => {
    expect(manifest.reducer.initialState).toEqual({ menu: [], datasetRegistry: expect.any(Object) })
  })

  it('creates a separate dataset registry for each manifest, so each map has its own', () => {
    const otherManifest = createManifest()
    expect(otherManifest.reducer.initialState.datasetRegistry).not.toBe(manifest.reducer.initialState.datasetRegistry)
  })

  it('has panels with a datasetsLayers panel', () => {
    expect(Array.isArray(manifest.panels)).toBe(true)
    expect(manifest.panels.find(p => p.id === 'datasetsLayers')).toBeDefined()
  })

  it('has a buttons array', () => {
    expect(Array.isArray(manifest.buttons)).toBe(true)
  })

  it('excludes the Layers button when there is no layers menu', () => {
    const button = manifest.buttons.find(button => button.id === 'datasetsLayers')
    const context = { pluginConfig: {}, pluginState: {} }

    hasLayersMenu.mockReturnValue(false)
    expect(button.excludeWhen(context)).toBe(true)
    hasLayersMenu.mockReturnValue(true)
    expect(button.excludeWhen(context)).toBe(false)
    expect(hasLayersMenu).toHaveBeenCalledWith(context)
  })

  it('leaves out the Layers button and panel when hasMenu is false', () => {
    const withoutMenu = createManifest({ hasMenu: false })
    expect(withoutMenu.buttons).toEqual([])
    expect(withoutMenu.panels).toEqual([])
    expect(withoutMenu.api).toEqual(manifest.api)
  })

  it('has an api with all expected methods', () => {
    expect(manifest.api.addDataset).toBeDefined()
    expect(manifest.api.removeDataset).toBeDefined()
    expect(manifest.api.setDatasetVisibility).toBeDefined()
    expect(manifest.api.setOpacity).toBeDefined()
    expect(manifest.api.getOpacity).toBeDefined()
  })
})
