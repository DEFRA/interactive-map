import { render, act } from '@testing-library/react'
import { DatasetsInit } from './DatasetsInit.jsx'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { attachGlobalState } from '../registry/globalDataset.js'
import { loadLayerAdapter, layerAdapter } from '../adapters/loadLayerAdapter.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { EVENTS } from '../../../../src/config/events.js'
import { datasetsToMenu } from '../reducers/datasetsToMenu.js'

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

const makeEventBus = () => {
  const listeners = new Map()
  return {
    emit: jest.fn((event, payload) => listeners.get(event)?.forEach(handler => handler(payload))),
    emitWhenReady: jest.fn(),
    on: jest.fn((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
    }),
    off: jest.fn((event, handler) => listeners.get(event)?.delete(handler))
  }
}

const makeAdapter = () => ({
  init: jest.fn().mockResolvedValue(undefined)
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

  describe('menu panel management', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it.each([
      { datasets: [] },
      { datasets: [{ id: 'roads' }] },
      { hasMenu: false, datasets: [{ id: 'roads', showInMenu: true }] }
    ])('leaves the panel registered and button state unchanged for %j', async (pluginConfig) => {
      const props = makeProps({ pluginConfig })
      await render(<DatasetsInit {...props} />)
      expect(props.services.eventBus.emitWhenReady).not.toHaveBeenCalled()
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_REMOVE_PANEL, expect.anything())
      expect(props.services.focusMap).not.toHaveBeenCalled()
    })

    it('keeps a configured menu open while the initial live menu is loading', async () => {
      const props = makeProps({ pluginState: makePluginState({ menuInitialised: false }) })
      await render(<DatasetsInit {...props} />)
      props.services.eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(props.services.focusMap).not.toHaveBeenCalled()
    })

    it('closes an open panel when its last menu dataset is removed, then focuses the map', async () => {
      const props = makeProps()
      const { eventBus, focusMap } = props.services
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
      eventBus.emit(EVENTS.APP_PANEL_CLOSED, { panelId: 'anotherPanel' })

      rerender(<DatasetsInit {...props} pluginState={makePluginState()} />)
      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      // Wait until the panel's modal focus trap and inert state have been cleared.
      expect(focusMap).not.toHaveBeenCalled()
      act(() => jest.runOnlyPendingTimers())
      expect(focusMap).toHaveBeenCalledTimes(1)
      expect(eventBus.emitWhenReady).not.toHaveBeenCalled()

      rerender(<DatasetsInit {...props} />)
      expect(eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_ADD_PANEL, expect.anything())
      expect(focusMap).toHaveBeenCalledTimes(1)
    })

    it.each([false, true])('does not move focus when the Layers panel is closed (previously opened: %s)', async (wasOpen) => {
      const props = makeProps()
      const { eventBus, focusMap } = props.services
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      if (wasOpen) {
        eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
        eventBus.emit(EVENTS.APP_PANEL_CLOSED, { panelId: 'datasetsLayers' })
      }
      eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'anotherPanel' })
      rerender(<DatasetsInit {...props} pluginState={makePluginState()} />)
      act(() => jest.runOnlyPendingTimers())
      expect(eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(focusMap).not.toHaveBeenCalled()
    })

    it('keeps the open panel when menu datasets remain', async () => {
      const props = makeProps()
      const { rerender } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      props.services.eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
      rerender(<DatasetsInit {...props} pluginState={makePluginState({ menu: [{ id: 'anotherDataset' }] })} />)
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(props.services.focusMap).not.toHaveBeenCalled()
    })

    it('unsubscribes and cancels pending focus on unmount', async () => {
      const props = makeProps({ pluginConfig: { datasets: [] } })
      const { eventBus, focusMap } = props.services
      const { unmount } = render(<DatasetsInit {...props} />)
      await act(async () => {})
      eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
      unmount()
      eventBus.emit.mockClear()
      eventBus.emit(EVENTS.APP_PANEL_OPENED, { panelId: 'datasetsLayers' })
      act(() => jest.runOnlyPendingTimers())
      expect(eventBus.emit).not.toHaveBeenCalledWith(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      expect(focusMap).not.toHaveBeenCalled()
      for (const [event, handler] of eventBus.on.mock.calls) {
        expect(eventBus.off).toHaveBeenCalledWith(event, handler)
      }
    })
  })

  // ─── initialisation ──────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('calls loadLayerAdapter and initialiseDatasets when base map is ready', async () => {
      const props = makeProps()
      await render(<DatasetsInit {...props} />)
      expect(loadLayerAdapter).toHaveBeenCalledWith(
        props.mapProvider, props.services.symbolRegistry, props.services.patternRegistry
      )
      expect(initialiseDatasets).toHaveBeenCalled()
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

    it('calls layerAdapter.onMapStyleChange when available', async () => {
      const onMapStyleChange = jest.fn()
      Object.assign(layerAdapter, { onMapStyleChange })
      const props = makeProps()
      await render(<DatasetsInit {...props} />)
      expect(onMapStyleChange).toHaveBeenCalled()
      delete layerAdapter.onMapStyleChange
    })

    // MapLibre gets this re-apply for free (map.addImage()/setPaintProperty() naturally
    // re-trigger its own MAP_DATA_CHANGE via the GL engine's styledata event) — OL doesn't (its
    // MAP_DATA_CHANGE is tied only to the basemap tile source's tileloadend, see appEvents.js),
    // so this emit is what lets the interact plugin's settle-window re-apply pick up newly
    // re-resolved symbols/patterns after a style change, instead of a stale highlight sticking.
    it('emits MAP_DATA_CHANGE once onMapStyleChange resolves, so highlights re-resolve for the new theme', async () => {
      let resolveOnMapStyleChange
      const onMapStyleChange = jest.fn(() => new Promise(resolve => { resolveOnMapStyleChange = resolve }))
      Object.assign(layerAdapter, { onMapStyleChange })
      const props = makeProps()
      await render(<DatasetsInit {...props} />)
      expect(props.services.eventBus.emit).not.toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
      await act(async () => {
        resolveOnMapStyleChange()
        await Promise.resolve()
      })
      expect(props.services.eventBus.emit).toHaveBeenCalledWith(EVENTS.MAP_DATA_CHANGE)
      delete layerAdapter.onMapStyleChange
    })
  })

  // ─── globals effect ──────────────────────────────────────────────────────────

  describe('globals effect', () => {
    it('calls attachGlobalState with the current globals', async () => {
      const globals = { visible: false, opacity: 0.5 }
      const props = makeProps({ pluginState: makePluginState({ globals }) })
      await render(<DatasetsInit {...props} />)
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
      await render(<DatasetsInit {...props} />)
      expect(applyStyle).toHaveBeenCalledWith('roads', {})
      expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actions })
      delete layerAdapter.applyStyle
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
