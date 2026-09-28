import { render, act } from '@testing-library/react'
import { EVENTS } from '../../../src/config/events.js'
import { DrawInit, getExclusiveControlKeep, getInterfaceItemIds } from './DrawInit.jsx'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'
import { useSpatialList } from './hooks/useSpatialList.js'

jest.mock('./adapters/loadDrawAdapter.js', () => ({ loadDrawAdapter: jest.fn() }))
jest.mock('./events.js', () => ({ attachEvents: jest.fn(() => jest.fn()) }))
jest.mock('./hooks/useSpatialList.js', () => ({ useSpatialList: jest.fn() }))

const makeProps = (overrides = {}) => {
  const adapter = { remove: jest.fn(), setInterfaceType: jest.fn() }
  loadDrawAdapter.mockResolvedValue(adapter)

  const props = {
    appState: { interfaceType: 'mouse', mode: null, spatialListRegistry: { registerItemProvider: jest.fn() }, layoutRefs: { viewportRef: { current: null } } },
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
    setExclusiveControl: jest.fn(),
    ...overrides
  }
  return { props, adapter }
}

const renderInit = async (props) => render(<DrawInit {...props} />)

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
      appState: { interfaceType: 'mouse', mode: 'measure', layoutRefs: { viewportRef: { current: null } } },
      pluginConfig: { snapLayers: [], excludeModes: ['measure'] }
    })
    await renderInit(props)
    expect(loadDrawAdapter).not.toHaveBeenCalled()
  })

  test('does not load when the app mode is outside the include list', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'mouse', mode: 'other', layoutRefs: { viewportRef: { current: null } } },
      pluginConfig: { snapLayers: [], includeModes: ['draw'] }
    })
    await renderInit(props)
    expect(loadDrawAdapter).not.toHaveBeenCalled()
  })

  test('removes the adapter, clears the reference, and releases activeMoveTarget on unmount', async () => {
    const { props, adapter } = makeProps()
    const result = await renderInit(props)
    expect(props.mapProvider.draw).toBe(adapter)
    props.mapProvider.activeMoveTarget = { move: jest.fn(), label: 'vertex' }

    result.unmount()

    expect(adapter.remove).toHaveBeenCalled()
    expect(props.mapProvider.draw).toBeNull()
    expect(props.mapProvider.activeMoveTarget).toBeNull()
  })

  test('ignores a late-resolving adapter after unmount', async () => {
    const { props, adapter } = makeProps()
    let resolveAdapter
    loadDrawAdapter.mockReturnValue(new Promise((resolve) => { resolveAdapter = resolve }))

    const result = render(<DrawInit {...props} />)
    result.unmount()
    await act(async () => { resolveAdapter(adapter); await Promise.resolve() })

    expect(props.mapProvider.draw).toBeNull()
    expect(props.services.eventBus.emit).not.toHaveBeenCalledWith('draw:ready')
  })
})

describe('features list suppression', () => {
  test('suppresses the features list while a draw/edit mode is active', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' } })
    await renderInit(props)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: true }
    )
  })

  // edit_vertex is the one exception — useSpatialList.js supplies its own list there
  // (claimed exclusively via the registry) instead of hiding it.
  test('does not suppress during edit_vertex', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' } })
    await renderInit(props)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false }
    )
  })

  test('leaves it unsuppressed when no mode is active', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: null } })
    await renderInit(props)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false }
    )
  })

  test('re-suppresses/unsuppresses as the mode changes across re-renders', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' } })
    const result = await renderInit(props)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: true }
    )

    props.services.eventBus.emit.mockClear()
    props.pluginState = { ...props.pluginState, mode: null }
    result.rerender(<DrawInit {...props} />)

    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false }
    )
  })

  test('unsuppresses on entering edit_vertex, then re-suppresses leaving it for another mode', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' } })
    const result = await renderInit(props)
    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false }
    )

    props.services.eventBus.emit.mockClear()
    props.pluginState = { ...props.pluginState, mode: 'draw_polygon' }
    result.rerender(<DrawInit {...props} />)

    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: true }
    )
  })

  test('releases the suppression on unmount, even mid-session', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_point' } })
    const result = await renderInit(props)
    props.services.eventBus.emit.mockClear()

    result.unmount()

    expect(props.services.eventBus.emit).toHaveBeenCalledWith(
      EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false }
    )
  })
})

describe('useSpatialList wiring', () => {
  test('is called with the plugin state/services/mapProvider, the app-level spatialListRegistry, and the viewport ref', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' } })
    await renderInit(props)
    expect(useSpatialList).toHaveBeenCalledWith({
      mapState: props.mapState,
      pluginState: props.pluginState,
      services: props.services,
      mapProvider: props.mapProvider,
      spatialListRegistry: props.appState.spatialListRegistry,
      viewportRef: props.appState.layoutRefs.viewportRef
    })
  })
})

describe('crosshair', () => {
  test('fixes the crosshair at centre while drawing on a touch interface', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'touch', mode: null, layoutRefs: { viewportRef: { current: null } } },
      pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' }
    })
    await renderInit(props)
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalled()
  })

  test('leaves the crosshair alone when not drawing', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'touch', mode: null, layoutRefs: { viewportRef: { current: null } } },
      pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' }
    })
    await renderInit(props)
    expect(props.mapState.crossHair.fixAtCenter).not.toHaveBeenCalled()
  })

  test('hides the crosshair on cleanup when it was hidden before and the interface has left touch/keyboard', async () => {
    const { props } = makeProps({
      appState: { interfaceType: 'touch', mode: null, layoutRefs: { viewportRef: { current: null } } },
      pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' }
    })
    const result = await renderInit(props)
    expect(props.mapState.crossHair.fixAtCenter).toHaveBeenCalled()

    // Switch away from touch/keyboard, then re-render so the crosshair effect's
    // cleanup runs — it reads the (mutated) interface type and hides the crosshair.
    props.appState.interfaceType = 'mouse'
    result.rerender(<DrawInit {...props} />)

    expect(props.mapState.crossHair.hide).toHaveBeenCalled()
  })
})

describe('interface type sync', () => {
  test.each(['edit_vertex', 'draw_polygon', 'draw_line'])('pushes the interface type to the adapter in %s mode', async (mode) => {
    const { props, adapter } = makeProps({ pluginState: { dispatch: jest.fn(), mode } })
    props.mapProvider.draw = adapter
    await renderInit(props)
    expect(adapter.setInterfaceType).toHaveBeenCalledWith('mouse')
  })

  test('does nothing outside draw/edit modes', async () => {
    const { props, adapter } = makeProps({ pluginState: { dispatch: jest.fn(), mode: null } })
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

describe('exclusive control', () => {
  test('claims exclusive control while in a draw/edit mode, keeping map styles, map controls and scale bar', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' } })
    await renderInit(props)
    expect(props.setExclusiveControl).toHaveBeenLastCalledWith(true, { keep: ['mapStyles', 'mapControls', 'scaleBar'] })
  })

  test('claims with the host\'s keep list in place of the default', async () => {
    const { props } = makeProps({
      pluginConfig: { snapLayers: ['a'], exclusiveControl: { keep: ['search', 'myButton'] } },
      pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' }
    })
    await renderInit(props)
    expect(props.setExclusiveControl).toHaveBeenLastCalledWith(true, { keep: ['search', 'myButton'] })
  })

  test('calls a keep function on entering a mode with the defaults and every current item id', async () => {
    const keep = jest.fn((defaults) => defaults.filter(id => id !== 'scaleBar'))
    const { props } = makeProps({
      pluginConfig: { snapLayers: ['a'], exclusiveControl: { keep } },
      pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' }
    })
    props.appState.buttonConfig = { search: {}, drawUndo: {} }
    props.appState.panelConfig = { mapStyles: {} }
    await renderInit(props)
    expect(keep).toHaveBeenCalledWith(['mapStyles', 'mapControls', 'scaleBar'], { ids: ['search', 'drawUndo', 'mapStyles'] })
    expect(props.setExclusiveControl).toHaveBeenLastCalledWith(true, { keep: ['mapStyles', 'mapControls'] })
  })

  test('does not call a keep function when the mode clears', async () => {
    const keep = jest.fn(() => [])
    const { props } = makeProps({
      pluginConfig: { snapLayers: ['a'], exclusiveControl: { keep } },
      pluginState: { dispatch: jest.fn(), mode: 'draw_line' }
    })
    const { rerender } = await renderInit(props)
    keep.mockClear()
    rerender(<DrawInit {...props} pluginState={{ dispatch: jest.fn(), mode: null }} />)
    expect(keep).not.toHaveBeenCalled()
  })

  test('releases exclusive control when the mode clears', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'draw_polygon' } })
    const { rerender } = await renderInit(props)
    rerender(<DrawInit {...props} pluginState={{ dispatch: jest.fn(), mode: null }} />)
    expect(props.setExclusiveControl.mock.lastCall[0]).toBe(false)
  })

  test('releases exclusive control on unmount', async () => {
    const { props } = makeProps({ pluginState: { dispatch: jest.fn(), mode: 'draw_line' } })
    const { unmount } = await renderInit(props)
    unmount()
    expect(props.setExclusiveControl).toHaveBeenLastCalledWith(false)
  })

  test('never claims when the host opts out with exclusiveControl: false', async () => {
    const { props } = makeProps({
      pluginConfig: { snapLayers: ['a'], exclusiveControl: false },
      pluginState: { dispatch: jest.fn(), mode: 'edit_vertex' }
    })
    const { unmount } = await renderInit(props)
    unmount()
    expect(props.setExclusiveControl).not.toHaveBeenCalled()
  })
})

describe('getExclusiveControlKeep', () => {
  test('uses the default keep list when no option is given', () => {
    expect(getExclusiveControlKeep(undefined)).toEqual(['mapStyles', 'mapControls', 'scaleBar'])
    expect(getExclusiveControlKeep(true)).toEqual(['mapStyles', 'mapControls', 'scaleBar'])
  })

  test('replaces the default with the host\'s keep list', () => {
    expect(getExclusiveControlKeep({ keep: ['mapControls'] })).toEqual(['mapControls'])
    expect(getExclusiveControlKeep({ keep: [] })).toEqual([])
  })

  test('passes a keep function a copy of the defaults and the item ids, using what it returns', () => {
    const keep = jest.fn((defaults, { ids }) => [...defaults, ids[0]])
    expect(getExclusiveControlKeep({ keep }, ['search'])).toEqual(['mapStyles', 'mapControls', 'scaleBar', 'search'])
    expect(keep).toHaveBeenCalledWith(['mapStyles', 'mapControls', 'scaleBar'], { ids: ['search'] })
  })

  test('a keep function mutating its defaults argument doesn\'t change the shared default', () => {
    getExclusiveControlKeep({ keep: (defaults) => { defaults.length = 0; return defaults } })
    expect(getExclusiveControlKeep(undefined)).toEqual(['mapStyles', 'mapControls', 'scaleBar'])
  })

  test('returns null when the host opts out', () => {
    expect(getExclusiveControlKeep(false)).toBeNull()
  })
})

describe('getInterfaceItemIds', () => {
  test('lists every button (not menu item), panel and control id once', () => {
    expect(getInterfaceItemIds({
      buttonConfig: { mapStyles: {}, drawUndo: {}, drawSnapItem: { isMenuItem: true } },
      panelConfig: { mapStyles: {}, mapKey: {} },
      controlConfig: { scaleBar: {} }
    })).toEqual(['mapStyles', 'drawUndo', 'mapKey', 'scaleBar'])
  })

  test('copes with missing config', () => {
    expect(getInterfaceItemIds({})).toEqual([])
  })
})
