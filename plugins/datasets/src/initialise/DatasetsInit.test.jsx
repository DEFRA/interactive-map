import { render, act } from '@testing-library/react'
import { DatasetsInit } from './DatasetsInit.jsx'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { attachGlobalState } from '../registry/globalDataset.js'
import { loadLayerAdapter, layerAdapter } from '../adapters/loadLayerAdapter.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { EVENTS } from '../../../../src/config/events.js'

jest.mock('../registry/datasetRegistry.js', () => ({
  datasetRegistry: {
    attach: jest.fn(),
    attachMapStyle: jest.fn(),
    attachCreateDataset: jest.fn()
  }
}))
jest.mock('../registry/globalDataset.js', () => ({
  attachGlobalState: jest.fn()
}))
jest.mock('../adapters/loadLayerAdapter.js', () => ({
  loadLayerAdapter: jest.fn(),
  layerAdapter: {}
}))
jest.mock('./initialiseDatasets.js')

const makeEventBus = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
})

const makeAdapter = () => ({
  init: jest.fn().mockResolvedValue(undefined)
})

const makePluginState = (overrides = {}) => ({
  dispatch: jest.fn(),
  mappedDatasets: {},
  orderedDatasets: [],
  globals: { visible: true, opacity: 1 },
  actionsArray: [],
  ...overrides
})

const makeProps = (overrides = {}) => ({
  pluginConfig: {
    datasets: [{ id: 'roads', label: 'Roads', showInMenu: true }]
  },
  pluginState: makePluginState(),
  appState: { mode: 'default' },
  mapState: { mapStyle: { id: 'outdoor' } },
  mapProvider: { isBaseMapReady: jest.fn().mockReturnValue(true) },
  services: {
    eventBus: makeEventBus(),
    symbolRegistry: {},
    patternRegistry: {}
  },
  ...overrides
})

describe('DatasetsInit', () => {
  let adapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = makeAdapter()
    loadLayerAdapter.mockResolvedValue(adapter)
    initialiseDatasets.mockReturnValue({ remove: jest.fn() })
  })

  it('renders null', () => {
    const { container } = render(<DatasetsInit {...makeProps()} />)
    expect(container.firstChild).toBeNull()
  })

  // ─── hasMenu / panel removal ─────────────────────────────────────────────────

  describe('menu panel management', () => {
    it('removes the datasetsLayers panel when no datasets have showInMenu', async () => {
      const props = makeProps({
        pluginConfig: { datasets: [{ id: 'roads', label: 'Roads' }] }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.APP_REMOVE_PANEL, 'datasetsLayers'
      )
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.APP_TOGGLE_BUTTON_STATE, { id: 'datasetsLayers', prop: 'hidden', value: true }
      )
    })

    it('does not remove the panel when at least one dataset has showInMenu', async () => {
      const props = makeProps()
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(
        EVENTS.APP_REMOVE_PANEL, 'datasetsLayers'
      )
    })

    it('removes the panel when hasMenu is explicitly false', async () => {
      const props = makeProps({
        pluginConfig: { hasMenu: false, datasets: [{ id: 'roads', label: 'Roads', showInMenu: true }] }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.APP_REMOVE_PANEL, 'datasetsLayers'
      )
    })

    it('includes datasets with sublayer showInMenu when checking for menu items', async () => {
      const props = makeProps({
        pluginConfig: {
          datasets: [{
            id: 'parent',
            label: 'Parent',
            sublayers: [{ id: 'child', showInMenu: true }]
          }]
        }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(
        EVENTS.APP_REMOVE_PANEL, 'datasetsLayers'
      )
    })
  })

  // ─── initialisation ──────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('calls loadLayerAdapter and initialiseDatasets when base map is ready', async () => {
      const props = makeProps()
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(loadLayerAdapter).toHaveBeenCalledWith(
        props.mapProvider, props.services.symbolRegistry, props.services.patternRegistry
      )
      expect(initialiseDatasets).toHaveBeenCalled()
    })

    it('does not initialise when base map is not ready', async () => {
      const props = makeProps({
        mapProvider: { isBaseMapReady: jest.fn().mockReturnValue(false) }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(loadLayerAdapter).not.toHaveBeenCalled()
    })

    it('does not initialise when mode is not in includeModes', async () => {
      const props = makeProps({
        pluginConfig: { datasets: [], includeModes: ['edit'] },
        appState: { mode: 'default' }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(loadLayerAdapter).not.toHaveBeenCalled()
    })

    it('does not initialise when mode is in excludeModes', async () => {
      const props = makeProps({
        pluginConfig: { datasets: [], excludeModes: ['default'] },
        appState: { mode: 'default' }
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(loadLayerAdapter).not.toHaveBeenCalled()
    })

    it('does not initialise twice when re-rendered', async () => {
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      rerender(<DatasetsInit {...props} mapState={{ mapStyle: { id: 'dark' } }} />)
      await act(async () => {})
      expect(loadLayerAdapter).toHaveBeenCalledTimes(1)
    })

    it('skips init when datasetsInstanceRef is already populated (mode change)', async () => {
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      // Change appState.mode — that's in the effect deps, so the effect re-runs
      await act(async () => {
        rerender(<DatasetsInit {...props} appState={{ mode: 'edit' }} />)
      })
      // loadLayerAdapter should only be called once despite the re-run
      expect(loadLayerAdapter).toHaveBeenCalledTimes(1)
    })

    it('calls remove on cleanup when unmounted after init', async () => {
      const removeFn = jest.fn()
      initialiseDatasets.mockReturnValue({ remove: removeFn })
      const props = makeProps()
      const { unmount } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      unmount()
      expect(removeFn).toHaveBeenCalled()
    })
  })

  // ─── registry / map style effects ────────────────────────────────────────────

  describe('datasetRegistry attach effects', () => {
    it('attaches mappedDatasets and orderedDatasets to the registry', async () => {
      const mappedDatasets = { roads: { id: 'roads' } }
      const orderedDatasets = ['roads']
      const props = makeProps({
        pluginState: makePluginState({ mappedDatasets, orderedDatasets })
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(datasetRegistry.attach).toHaveBeenCalledWith(mappedDatasets, orderedDatasets)
    })

    it('attaches the map style to the registry', async () => {
      const props = makeProps()
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(datasetRegistry.attachMapStyle).toHaveBeenCalledWith(props.mapState.mapStyle)
    })

    it('calls layerAdapter.onMapStyleChange when available', async () => {
      const onMapStyleChange = jest.fn()
      Object.assign(layerAdapter, { onMapStyleChange })
      const props = makeProps()
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(onMapStyleChange).toHaveBeenCalled()
      delete layerAdapter.onMapStyleChange
    })
  })

  // ─── globals effect ──────────────────────────────────────────────────────────

  describe('globals effect', () => {
    it('calls attachGlobalState with the current globals', async () => {
      const globals = { visible: false, opacity: 0.5 }
      const props = makeProps({ pluginState: makePluginState({ globals }) })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(attachGlobalState).toHaveBeenCalledWith(globals)
    })
  })

  // ─── actionsArray effect ─────────────────────────────────────────────────────

  describe('actionsArray effect', () => {
    it('calls each queued adapter method and dispatches REMOVE_ADAPTER_ACTIONS', async () => {
      const applyStyle = jest.fn()
      Object.assign(layerAdapter, { applyStyle })
      const actions = [{ method: 'applyStyle', parameters: ['roads', {}] }]
      const dispatch = jest.fn()
      const props = makeProps({
        pluginState: makePluginState({ actionsArray: actions, dispatch })
      })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(applyStyle).toHaveBeenCalledWith('roads', {})
      expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actions })
      delete layerAdapter.applyStyle
    })

    it('skips dispatching when actionsArray is empty', async () => {
      const dispatch = jest.fn()
      const props = makeProps({ pluginState: makePluginState({ actionsArray: [], dispatch }) })
      await act(async () => { render(<DatasetsInit {...props} />) })
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REMOVE_ADAPTER_ACTIONS' })
      )
    })
  })
})
