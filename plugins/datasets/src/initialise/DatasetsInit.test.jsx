import { render, act } from '@testing-library/react'
import { DatasetsInit } from './DatasetsInit.jsx'
import { createDatasetRegistry } from '../registry/datasetRegistry.js'
import { loadLayerAdapter } from '../adapters/loadLayerAdapter.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { EVENTS } from '../../../../src/config/events.js'
import { datasetsToMenu } from '../reducers/datasetsToMenu.js'

jest.mock('../registry/datasetRegistry.js', () => ({
  createDatasetRegistry: jest.fn()
}))
jest.mock('../adapters/loadLayerAdapter.js', () => ({
  loadLayerAdapter: jest.fn()
}))
jest.mock('./initialiseDatasets.js')

const makeEventBus = () => ({
  emit: jest.fn(),
  emitWhenReady: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
})

const makeAdapter = () => ({
  init: jest.fn().mockResolvedValue(undefined)
})

const makeDatasetRegistry = () => ({
  attach: jest.fn(),
  attachMapStyle: jest.fn(),
  attachGlobals: jest.fn()
})

const makePluginState = (overrides = {}) => ({
  dispatch: jest.fn(),
  mappedDatasets: {},
  orderedDatasets: [],
  menu: [],
  menuInitialised: true,
  globals: { visible: true, opacity: 1 },
  actionsArray: [],
  ...overrides
})

const makeProps = (overrides = {}) => {
  const pluginConfig = overrides.pluginConfig ?? {
    datasets: [{ id: 'roads', label: 'Roads', showInMenu: true }]
  }
  return {
    appConfig: { id: 'test-map' },
    appState: { openPanels: {} },
    pluginConfig,
    pluginState: makePluginState({ menu: datasetsToMenu(pluginConfig) }),
    mapState: { mapStyle: { id: 'outdoor' } },
    mapProvider: { isBaseMapReady: jest.fn().mockReturnValue(true) },
    services: {
      eventBus: makeEventBus(),
      focusMap: jest.fn(),
      symbolRegistry: {},
      patternRegistry: {}
    },
    ...overrides
  }
}

describe('DatasetsInit', () => {
  let adapter
  let datasetRegistry

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = makeAdapter()
    datasetRegistry = makeDatasetRegistry()
    createDatasetRegistry.mockImplementation(() => datasetRegistry)
    loadLayerAdapter.mockResolvedValue(adapter)
    initialiseDatasets.mockReturnValue({ remove: jest.fn() })
  })

  it('renders null', () => {
    const { container } = render(<DatasetsInit {...makeProps()} />)
    expect(container.firstChild).toBeNull()
  })

  describe('menu panel management', () => {
    const openPanelState = { openPanels: { datasetsLayers: {} } }
    let panelEl

    beforeEach(() => {
      jest.useFakeTimers()
      panelEl = document.createElement('div')
      panelEl.id = 'test-map-panel-datasets-layers'
      panelEl.tabIndex = -1
      document.body.appendChild(panelEl)
    })

    afterEach(() => {
      panelEl.remove()
      jest.useRealTimers()
    })

    it('does not remove the panel or hide the button when there is no menu', () => {
      const props = makeProps({ pluginConfig: { datasets: [] } })
      render(<DatasetsInit {...props} />)
      expect(props.services.eventBus.emitWhenReady).not.toHaveBeenCalled()
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_REMOVE_PANEL, expect.anything())
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_TOGGLE_BUTTON_STATE, expect.anything())
    })

    it('closes the open panel and focuses the map when the menu empties with focus inside it', () => {
      const props = makeProps({ appState: openPanelState })
      const { eventBus, focusMap } = props.services
      const { rerender } = render(<DatasetsInit {...props} />)
      panelEl.focus()

      rerender(<DatasetsInit {...props} pluginState={makePluginState()} />)
      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(focusMap).not.toHaveBeenCalled()
      act(() => jest.runOnlyPendingTimers())
      expect(focusMap).toHaveBeenCalledTimes(1)
    })

    it('closes the open panel without moving focus when focus is outside it', () => {
      const props = makeProps({ appState: openPanelState })
      const { eventBus, focusMap } = props.services
      const { rerender } = render(<DatasetsInit {...props} />)

      rerender(<DatasetsInit {...props} pluginState={makePluginState()} />)
      act(() => jest.runOnlyPendingTimers())
      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(focusMap).not.toHaveBeenCalled()
    })

    it('closes a panel that is open on load when there is no menu', () => {
      const props = makeProps({ pluginConfig: { datasets: [] }, appState: openPanelState })
      render(<DatasetsInit {...props} />)
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
    })

    it.each([
      ['the panel is closed', {}, makePluginState()],
      ['menu datasets remain', openPanelState.openPanels, makePluginState({ menu: [{ id: 'roads' }] })],
      ['the live menu is still loading', openPanelState.openPanels, makePluginState({ menuInitialised: false })]
    ])('leaves the panel alone when %s', (_, openPanels, pluginState) => {
      const props = makeProps({ appState: { openPanels } })
      render(<DatasetsInit {...props} pluginState={pluginState} />)
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
    })

    it('cancels a pending map focus on unmount', () => {
      const props = makeProps({ appState: openPanelState })
      const { rerender, unmount } = render(<DatasetsInit {...props} />)
      panelEl.focus()
      rerender(<DatasetsInit {...props} pluginState={makePluginState()} />)
      unmount()
      act(() => jest.runOnlyPendingTimers())
      expect(props.services.focusMap).not.toHaveBeenCalled()
    })
  })

  // ─── initialisation ──────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('calls loadLayerAdapter and initialiseDatasets when base map is ready', async () => {
      const props = makeProps()
      await render(<DatasetsInit {...props} />)
      expect(loadLayerAdapter).toHaveBeenCalledWith(
        props.mapProvider, props.services.symbolRegistry, props.services.patternRegistry, datasetRegistry
      )
      expect(initialiseDatasets).toHaveBeenCalled()
    })

    it('passes its own registry and adapter to initialiseDatasets', async () => {
      const props = makeProps()
      render(<DatasetsInit {...props} />)
      await act(async () => {})
      expect(initialiseDatasets).toHaveBeenCalledWith(expect.objectContaining({ adapter, datasetRegistry }))
    })

    it('dispatches its registry, then its adapter once loaded', async () => {
      const dispatch = jest.fn()
      const props = makeProps({ pluginState: makePluginState({ dispatch }) })
      render(<DatasetsInit {...props} />)
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DATASET_REGISTRY', payload: datasetRegistry })
      await act(async () => {})
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYER_ADAPTER', payload: adapter })
    })

    it('creates a separate registry for each instance', () => {
      const registryA = makeDatasetRegistry()
      const registryB = makeDatasetRegistry()
      createDatasetRegistry.mockImplementationOnce(() => registryA).mockImplementationOnce(() => registryB)
      const dispatchA = jest.fn()
      const dispatchB = jest.fn()
      render(<DatasetsInit {...makeProps({ pluginState: makePluginState({ dispatch: dispatchA }) })} />)
      render(<DatasetsInit {...makeProps({ pluginState: makePluginState({ dispatch: dispatchB }) })} />)
      expect(dispatchA).toHaveBeenCalledWith({ type: 'SET_DATASET_REGISTRY', payload: registryA })
      expect(dispatchB).toHaveBeenCalledWith({ type: 'SET_DATASET_REGISTRY', payload: registryB })
    })

    it('keeps the same registry across re-renders', () => {
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      rerender(<DatasetsInit {...props} mapState={{ mapStyle: { id: 'dark' } }} />)
      expect(createDatasetRegistry).toHaveBeenCalledTimes(1)
    })

    it('does not initialise when base map is not ready', async () => {
      const props = makeProps({
        mapProvider: { isBaseMapReady: jest.fn().mockReturnValue(false) }
      })
      await render(<DatasetsInit {...props} />)
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

    it('skips init when datasetsInstanceRef is already populated (base map reloads)', async () => {
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      // Toggle base map readiness — that's the effect's dependency, so the effect re-runs
      await act(async () => {
        rerender(<DatasetsInit {...props} mapProvider={{ isBaseMapReady: () => false }} />)
      })
      await act(async () => {
        rerender(<DatasetsInit {...props} mapProvider={{ isBaseMapReady: () => true }} />)
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
      await render(<DatasetsInit {...props} />)
      expect(datasetRegistry.attach).toHaveBeenCalledWith(mappedDatasets, orderedDatasets)
    })

    it('attaches the map style to the registry', async () => {
      const props = makeProps()
      await render(<DatasetsInit {...props} />)
      expect(datasetRegistry.attachMapStyle).toHaveBeenCalledWith(props.mapState.mapStyle)
    })

    it('calls layerAdapter.onMapStyleChange when the map style changes after the adapter loads', async () => {
      adapter.onMapStyleChange = jest.fn()
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      expect(adapter.onMapStyleChange).not.toHaveBeenCalled()
      rerender(<DatasetsInit {...props} mapState={{ mapStyle: { id: 'dark' } }} />)
      expect(adapter.onMapStyleChange).toHaveBeenCalled()
    })

    // MapLibre gets this re-apply for free (map.addImage()/setPaintProperty() naturally
    // re-trigger its own MAP_DATA_CHANGE via the GL engine's styledata event) — OL doesn't (its
    // MAP_DATA_CHANGE is tied only to the basemap tile source's tileloadend, see appEvents.js),
    // so this emit is what lets the interact plugin's settle-window re-apply pick up newly
    // re-resolved symbols/patterns after a style change, instead of a stale highlight sticking.
    it('emits MAP_DATA_CHANGE once onMapStyleChange resolves, so highlights re-resolve for the new theme', async () => {
      let resolveOnMapStyleChange
      adapter.onMapStyleChange = jest.fn(() => new Promise(resolve => { resolveOnMapStyleChange = resolve }))
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      rerender(<DatasetsInit {...props} mapState={{ mapStyle: { id: 'dark' } }} />)
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
      await act(async () => {
        resolveOnMapStyleChange()
        await Promise.resolve()
      })
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
    })
  })

  // ─── globals effect ──────────────────────────────────────────────────────────

  describe('globals effect', () => {
    it('attaches the current globals to the registry', async () => {
      const globals = { visible: false, opacity: 0.5 }
      const props = makeProps({ pluginState: makePluginState({ globals }) })
      await render(<DatasetsInit {...props} />)
      expect(datasetRegistry.attachGlobals).toHaveBeenCalledWith(globals)
    })
  })

  // ─── actionsArray effect ─────────────────────────────────────────────────────

  describe('actionsArray effect', () => {
    it('calls each queued adapter method once the adapter has loaded, and dispatches REMOVE_ADAPTER_ACTIONS', async () => {
      adapter.applyStyle = jest.fn()
      const actions = [{ method: 'applyStyle', parameters: ['roads', {}] }]
      const dispatch = jest.fn()
      const props = makeProps({
        pluginState: makePluginState({ actionsArray: actions, dispatch })
      })
      const { rerender } = render(<DatasetsInit {...props} />)
      expect(adapter.applyStyle).not.toHaveBeenCalled()
      await act(async () => {})
      // The adapter reaches pluginState through SET_LAYER_ADAPTER
      rerender(<DatasetsInit {...props} pluginState={makePluginState({ actionsArray: actions, dispatch, layerAdapter: adapter })} />)
      expect(adapter.applyStyle).toHaveBeenCalledWith('roads', {})
      expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actions })
    })

    it('skips dispatching when actionsArray is empty', async () => {
      const dispatch = jest.fn()
      const props = makeProps({ pluginState: makePluginState({ actionsArray: [], dispatch }) })
      await render(<DatasetsInit {...props} />)
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REMOVE_ADAPTER_ACTIONS' })
      )
    })
  })
})
