import React, { useReducer } from 'react'
import { act, render } from '@testing-library/react'
import { DatasetsInit } from './DatasetsInit.jsx'
import { manifest } from '../manifest.js'
import { initialState, actions } from '../reducers/pluginState.js'
import { addDataset } from '../api/addDataset.js'
import { removeDataset } from '../api/removeDataset.js'
import { actionsMap } from '../../../../src/App/store/appActionsMap.js'
import { AppContext } from '../../../../src/App/store/AppProvider.jsx'
import { ServiceContext } from '../../../../src/App/store/ServiceProvider.jsx'
import { useInterfaceAPI } from '../../../../src/App/hooks/useInterfaceAPI.js'
import { createPanelRegistry } from '../../../../src/App/registry/panelRegistry.js'
import { mapButtons } from '../../../../src/App/renderer/mapButtons.js'
import { createEventBus } from '../../../../src/services/eventBus.js'
import { EVENTS } from '../../../../src/config/events.js'

// Keep dataset initialisation, reducers, the interface API and rendering rules real;
// only the map engine adapter is replaced.
jest.mock('../adapters/loadLayerAdapter.js', () => {
  const layerAdapter = {
    init: jest.fn().mockResolvedValue(undefined),
    attachDynamicSources: jest.fn(),
    onMapSizeChange: jest.fn(),
    addDataset: jest.fn(),
    removeDataset: jest.fn(),
    destroy: jest.fn()
  }
  return {
    layerAdapter,
    loadLayerAdapter: jest.fn().mockResolvedValue(layerAdapter)
  }
})

const panelId = 'datasetsLayers'
const dataset = { id: 'roads', label: 'Roads', showInMenu: true }

async function renderLifecycle (options = {}) {
  const eventBus = createEventBus()
  const pluginConfig = { datasets: [], ...options }
  const panel = {
    ...manifest.panels[0],
    pluginId: 'datasets',
    label: 'Local map layers',
    render: () => <p>Custom layer content</p>,
    desktop: { ...manifest.panels[0].desktop, width: '360px', slot: 'right-top' }
  }
  const panelRegistry = createPanelRegistry()
  panelRegistry.registerPanel({ [panelId]: panel })
  const pluginRegistry = {
    registeredPlugins: [{ id: 'datasets', config: pluginConfig, manifest: { ...manifest, panels: [panel] } }]
  }
  const appConfig = { id: 'test-map', pluginRegistry }
  const services = { eventBus, symbolRegistry: {}, patternRegistry: {} }
  const mapState = { mapStyle: { id: 'outdoor' } }
  const mapProvider = { isBaseMapReady: () => true }
  let current

  function InterfaceBindings (props) {
    useInterfaceAPI()
    return <DatasetsInit {...props} />
  }

  function Harness () {
    const [app, dispatchApp] = useReducer(
      (state, action) => actionsMap[action.type](state, action.payload),
      {
        breakpoint: 'desktop',
        isFullscreen: true,
        openPanels: {},
        panelConfig: panelRegistry.getPanelConfig(),
        panelRegistry,
        pluginRegistry,
        buttonConfig: { [panelId]: { ...manifest.buttons[0], pluginId: 'datasets' } },
        hiddenButtons: new Set(),
        disabledButtons: new Set(),
        pressedButtons: new Set(),
        expandedButtons: new Set()
      }
    )
    const [plugin, dispatchPlugin] = useReducer(
      (state, action) => actions[action.type](state, action.payload),
      { ...initialState, menu: [], mappedDatasets: {}, orderedDatasets: [], actionsArray: [] }
    )
    const appState = { ...app, dispatch: dispatchApp }
    const pluginState = { ...plugin, dispatch: dispatchPlugin }
    current = { appConfig, appState, pluginConfig, pluginState, mapState, mapProvider, services }

    return (
      <AppContext.Provider value={appState}>
        <ServiceContext.Provider value={services}>
          <InterfaceBindings {...current} />
        </ServiceContext.Provider>
      </AppContext.Provider>
    )
  }

  await act(async () => { render(<Harness />) })

  return {
    panel,
    panelRegistry,
    eventBus,
    get state () { return current },
    buttons: () => mapButtons({
      slot: 'top-left',
      appState: current.appState,
      appConfig,
      evaluateProp: (prop) => typeof prop === 'function' ? prop(current) : prop
    }),
    add: () => act(() => addDataset(current, { ...dataset })),
    remove: () => act(() => removeDataset(current, dataset.id))
  }
}

describe('datasets Layers menu lifecycle', () => {
  it.each([
    ['dataset', { ...dataset }],
    ['sublayer', {
      id: 'transport',
      label: 'Transport',
      sublayers: [{ id: 'roads', label: 'Roads', showInMenu: true }]
    }]
  ])('restores the menu after initialising a configured %s', async (_, configuredDataset) => {
    const lifecycle = await renderLifecycle({ datasets: [configuredDataset] })

    expect(lifecycle.state.pluginState.menu).toHaveLength(1)
    expect(lifecycle.buttons()).toHaveLength(1)
    expect(lifecycle.buttons()[0].element.props.isHidden).toBe(false)
    expect(lifecycle.state.appState.hiddenButtons.has(panelId)).toBe(false)
    expect(lifecycle.state.appState.panelConfig[panelId]).toMatchObject(lifecycle.panel)
    expect(lifecycle.state.appState.panelConfig[panelId].render).toBe(lifecycle.panel.render)
    expect(lifecycle.panelRegistry.getPanelConfig()[panelId]).toMatchObject(lifecycle.panel)
  })

  it('removes the button with an empty menu and restores the original panel after add, remove and re-add', async () => {
    const lifecycle = await renderLifecycle()

    expect(lifecycle.buttons()).toEqual([])
    expect(lifecycle.state.appState.panelConfig[panelId]).toBeUndefined()
    expect(lifecycle.panelRegistry.getPanelConfig()[panelId]).toBeUndefined()

    lifecycle.add()
    expect(lifecycle.state.pluginState.menu).toHaveLength(1)
    expect(lifecycle.buttons()).toHaveLength(1)
    expect(lifecycle.state.appState.panelConfig[panelId]).toMatchObject(lifecycle.panel)
    expect(lifecycle.panelRegistry.getPanelConfig()[panelId]).toMatchObject(lifecycle.panel)

    act(() => lifecycle.eventBus.emit(EVENTS.APP_SHOW_PANEL, { id: panelId }))
    expect(lifecycle.state.appState.openPanels[panelId]).toBeDefined()

    lifecycle.remove()
    expect(lifecycle.state.pluginState.menu).toEqual([])
    expect(lifecycle.buttons()).toEqual([])
    expect(lifecycle.state.appState.panelConfig[panelId]).toBeUndefined()
    expect(lifecycle.state.appState.openPanels[panelId]).toBeUndefined()

    lifecycle.add()
    expect(lifecycle.buttons()).toHaveLength(1)
    expect(lifecycle.state.appState.panelConfig[panelId]).toMatchObject(lifecycle.panel)
    expect(lifecycle.state.appState.panelConfig[panelId].render).toBe(lifecycle.panel.render)
    expect(lifecycle.panelRegistry.getPanelConfig()[panelId]).toMatchObject(lifecycle.panel)
    act(() => lifecycle.eventBus.emit(EVENTS.APP_SHOW_PANEL, { id: panelId }))
    expect(lifecycle.state.appState.openPanels[panelId]).toBeDefined()
  })

  it('keeps the button and panel absent when hasMenu is false despite a runtime menu dataset', async () => {
    const lifecycle = await renderLifecycle({ hasMenu: false })
    lifecycle.add()

    expect(lifecycle.state.pluginState.menu).toHaveLength(1)
    expect(lifecycle.buttons()).toEqual([])
    expect(lifecycle.state.appState.panelConfig[panelId]).toBeUndefined()
    expect(lifecycle.panelRegistry.getPanelConfig()[panelId]).toBeUndefined()
  })

  it('preserves a consumer-hidden button across menu removal and restoration', async () => {
    const lifecycle = await renderLifecycle()
    lifecycle.add()
    act(() => lifecycle.eventBus.emit(EVENTS.APP_TOGGLE_BUTTON_STATE, {
      id: panelId, prop: 'hidden', value: true
    }))
    expect(lifecycle.buttons()[0].element.props.isHidden).toBe(true)

    lifecycle.remove()
    expect(lifecycle.buttons()).toEqual([])
    expect(lifecycle.state.appState.hiddenButtons.has(panelId)).toBe(true)

    lifecycle.add()
    expect(lifecycle.buttons()[0].element.props.isHidden).toBe(true)
    expect(lifecycle.state.appState.hiddenButtons.has(panelId)).toBe(true)
  })
})
