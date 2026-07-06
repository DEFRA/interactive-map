import { render, act } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { DrawInit } from './DrawInit.jsx'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'

jest.mock('./adapters/loadDrawAdapter.js', () => ({ loadDrawAdapter: jest.fn() }))
jest.mock('./events.js', () => ({ attachEvents: jest.fn(() => jest.fn()) }))

const makeProps = (overrides = {}) => {
  const adapter = { remove: jest.fn(), setInterfaceType: jest.fn() }
  loadDrawAdapter.mockResolvedValue(adapter)

  const props = {
    appState: { interfaceType: 'mouse', mode: null },
    appConfig: { id: 'app' },
    mapState: {
      isMapReady: true,
      mapStyle: { id: 'outdoor' },
      crossHair: { isVisible: false, fixAtCenter: jest.fn(), hide: jest.fn() }
    },
    pluginConfig: { snapLayers: ['a'] },
    pluginState: { dispatch: jest.fn(), mode: null },
    services: { eventBus: { emit: jest.fn() } },
    mapProvider: { draw: null },
    buttonConfig: {},
    ...overrides
  }
  return { props, adapter }
}

const renderInit = async (props) => {
  let result
  await act(async () => { result = render(<DrawInit {...props} />) })
  return result
}

beforeEach(() => jest.clearAllMocks())

describe('adapter lifecycle', () => {
  test('loads the adapter and announces readiness when the map is ready', async () => {
    const { props, adapter } = makeProps()

    await renderInit(props)

    expect(loadDrawAdapter).toHaveBeenCalledWith(props.mapProvider, expect.objectContaining({
      mapStyle: props.mapState.mapStyle,
      snapLayers: props.pluginConfig.snapLayers,
      events: EVENTS,
      eventBus: props.services.eventBus
    }))
    expect(props.mapProvider.draw).toBe(adapter)
    expect(props.pluginState.dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_SNAP_LAYERS', payload: true })
    expect(props.services.eventBus.emit).toHaveBeenCalledWith('draw:ready')
  })

  test('does not load when the map is not ready', async () => {
    const { props } = makeProps({
      mapState: { isMapReady: false, mapStyle: {}, crossHair: { isVisible: false, fixAtCenter: jest.fn(), hide: jest.fn() } }
    })
    await renderInit(props)
    expect(loadDrawAdapter).not.toHaveBeenCalled()
  })

  test('does not load when the app mode is excluded', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'mouse', mode: 'measure' },
      pluginConfig: { snapLayers: [], excludeModes: ['measure'] }
    })
    await renderInit(props)
    expect(loadDrawAdapter).not.toHaveBeenCalled()
  })

  test('does not load when the app mode is outside the include list', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'mouse', mode: 'other' },
      pluginConfig: { snapLayers: [], includeModes: ['draw'] }
    })
    await renderInit(props)
    expect(loadDrawAdapter).not.toHaveBeenCalled()
  })

  test('removes the adapter and clears the reference on unmount', async () => {
    const { props, adapter } = makeProps()
    const result = await renderInit(props)
    expect(props.mapProvider.draw).toBe(adapter)

    await act(async () => { result.unmount() })

    expect(adapter.remove).toHaveBeenCalled()
    expect(props.mapProvider.draw).toBeNull()
  })

  test('ignores a late-resolving adapter after unmount', async () => {
    const { props, adapter } = makeProps()
    let resolveAdapter
    loadDrawAdapter.mockReturnValue(new Promise((resolve) => { resolveAdapter = resolve }))

    let result
    await act(async () => { result = render(<DrawInit {...props} />) })
    await act(async () => { result.unmount() })
    await act(async () => { resolveAdapter(adapter); await Promise.resolve() })

    expect(props.mapProvider.draw).toBeNull()
    expect(props.services.eventBus.emit).not.toHaveBeenCalledWith('draw:ready')
  })
})

describe('crosshair', () => {
  test('fixes the crosshair at centre while drawing on a touch interface', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'touch', mode: null },
      pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' }
    })
    await renderInit(props)
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalled()
  })

  test('leaves the crosshair alone when not drawing', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'touch', mode: null },
      pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' }
    })
    await renderInit(props)
    expect(props.mapState.crossHair.fixAtCenter).not.toHaveBeenCalled()
  })
})

describe('interface type sync', () => {
  test('pushes the interface type to the adapter in edit mode', async () => {
    const { props, adapter } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' } })
    props.mapProvider.draw = adapter
    await renderInit(props)
    expect(adapter.setInterfaceType).toHaveBeenCalledWith('mouse')
  })

  test('does nothing outside edit mode', async () => {
    const { props, adapter } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'draw_line' } })
    props.mapProvider.draw = adapter
    await renderInit(props)
    expect(adapter.setInterfaceType).not.toHaveBeenCalled()
  })
})

describe('event attachment', () => {
  test('attaches events when a draw adapter is present', async () => {
    const { props, adapter } = makeProps()
    props.mapProvider.draw = adapter
    await renderInit(props)
    expect(attachEvents).toHaveBeenCalledWith(expect.objectContaining({
      mapProvider: props.mapProvider,
      buttonConfig: props.buttonConfig,
      pluginState: props.pluginState,
      eventBus: props.services.eventBus,
      events: EVENTS
    }))
  })

  test('does not attach events without a draw adapter', async () => {
    const { props } = makeProps({
      mapState: { isMapReady: false, mapStyle: {}, crossHair: { isVisible: false, fixAtCenter: jest.fn(), hide: jest.fn() } }
    })
    await renderInit(props)
    expect(attachEvents).not.toHaveBeenCalled()
  })
})
