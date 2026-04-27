import { renderHook, act } from '@testing-library/react'
import { useMapItemList } from './useMapItemList.js'

const MOVE_END = 'map:moveend'
const SET_FEATURES = 'map:setfeatures'
const SET_ACTIVE = 'map:setactivefeature'

const makeEventBus = () => {
  const listeners = {}
  return {
    on: jest.fn((e, fn) => { listeners[e] = fn }),
    off: jest.fn(),
    emit: jest.fn((e, payload) => listeners[e]?.(payload))
  }
}

const makeMarkerEl = ({ inViewport = true } = {}) => {
  const el = document.createElement('div')
  const container = document.createElement('div')
  container.className = 'im-c-viewport__markers'
  container.appendChild(el)
  document.body.appendChild(container)

  const containerRect = { left: 0, top: 0, right: 500, bottom: 500 }
  const markerRect = inViewport
    ? { left: 100, top: 100, right: 150, bottom: 150 }
    : { left: 600, top: 600, right: 650, bottom: 650 }

  jest.spyOn(container, 'getBoundingClientRect').mockReturnValue(containerRect)
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue(markerRect)

  return { el, container }
}

const makeMarkers = (overrides = []) => {
  const markerRefs = new Map()
  return { items: overrides, markerRefs }
}

const makeMapProvider = (features = []) => ({
  getVisibleFeatures: jest.fn(() => features)
})

const setup = ({ interactionModes = [], markers, layers = [], mapProvider, eventBus, dispatch } = {}) => {
  const eb = eventBus ?? makeEventBus()
  const mp = mapProvider ?? makeMapProvider()
  const dp = dispatch ?? jest.fn()
  const { result, unmount } = renderHook(() => useMapItemList({
    mapState: { markers: markers ?? makeMarkers() },
    pluginState: { interactionModes, layers, dispatch: dp },
    services: { eventBus: eb },
    mapProvider: mp
  }))
  return { eb, mp, dp, result, unmount }
}

// ─── useMapItemList — lifecycle ──────────────────────────────────────────

describe('useMapItemList — lifecycle', () => {
  it('subscribes to map:moveend on mount', () => {
    const { eb } = setup()
    expect(eb.on).toHaveBeenCalledWith(MOVE_END, expect.any(Function))
  })

  it('unsubscribes from map:moveend on unmount', () => {
    const { eb, unmount } = setup()
    unmount()
    expect(eb.off).toHaveBeenCalledWith(MOVE_END, expect.any(Function))
  })
})

// ─── useMapItemList — selectMarker mode ───────────────────────────────────

describe('useMapItemList — selectMarker mode', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('emits visible markers as items on moveend', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: 'Marker One', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: 'm1', label: 'Marker One' }]
    })
    container.remove()
  })

  it('excludes markers outside the viewport', () => {
    const { el, container } = makeMarkerEl({ inViewport: false })
    const markers = makeMarkers([{ id: 'm1', label: 'Offscreen', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [] })
    container.remove()
  })

  it('excludes standalone label markers', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: 'Label', symbol: null, isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [] })
    container.remove()
  })

  it('falls back to marker id when label is absent', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: 'm1', label: 'm1' }]
    })
    container.remove()
  })
})

// ─── useMapItemList — selectFeature mode ──────────────────────────────────

describe('useMapItemList — selectFeature mode', () => {
  const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]

  it('emits layer features as items on moveend', () => {
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'High Street' } }
    ]
    const { eb, mp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })

    act(() => eb.emit(MOVE_END, {}))

    expect(mp.getVisibleFeatures).toHaveBeenCalledWith(['roads'])
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: '1', label: 'High Street' }]
    })
  })

  it('falls back to idProperty value when labelProperty is absent on feature', () => {
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '2' } }
    ]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })

    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: '2', label: '2' }]
    })
  })

  it('uses idProperty as label when layer has no labelProperty configured', () => {
    const layersNoLabel = [{ layerId: 'roads', idProperty: 'road_id' }]
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '3' } }
    ]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers: layersNoLabel,
      mapProvider: makeMapProvider(features)
    })

    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: '3', label: '3' }]
    })
  })

  it('skips features with no matching layer config', () => {
    const features = [
      { layer: { id: 'unknown-layer' }, properties: { road_id: '4' } }
    ]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })

    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [] })
  })

  it('emits empty items when layers array is empty', () => {
    const { eb } = setup({ interactionModes: ['selectFeature'], layers: [] })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [] })
  })
})

// ─── useMapItemList — combined modes ─────────────────────────────────────

describe('useMapItemList — combined modes', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('emits both markers and features when both modes are active', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: 'A Marker', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]
    const features = [{ layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'Main Rd' } }]

    const { eb } = setup({
      interactionModes: ['selectMarker', 'selectFeature'],
      markers,
      layers,
      mapProvider: makeMapProvider(features)
    })

    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: 'm1', label: 'A Marker' }, { id: '1', label: 'Main Rd' }]
    })
    container.remove()
  })

  it('emits empty items when no interaction modes are active', () => {
    const { eb } = setup({ interactionModes: [] })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [] })
  })
})

// ─── useMapItemList — map:setactivefeature listener ──────────────────────

describe('useMapItemList — map:setactivefeature listener', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('subscribes to map:setactivefeature on mount and unsubscribes on unmount', () => {
    const { eb, unmount } = setup()
    expect(eb.on).toHaveBeenCalledWith(SET_ACTIVE, expect.any(Function)) // NOSONAR
    unmount()
    expect(eb.off).toHaveBeenCalledWith(SET_ACTIVE, expect.any(Function)) // NOSONAR
  })

  it('dispatches CLEAR_SELECTED_FEATURES when id is null', () => {
    const { eb, dp } = setup({ interactionModes: ['selectMarker'] })
    act(() => eb.emit(SET_ACTIVE, { id: null })) // NOSONAR
    expect(dp).toHaveBeenCalledWith({ type: 'CLEAR_SELECTED_FEATURES' })
  })

  it('dispatches SELECT_MARKER when id matches a marker', () => {
    const markers = makeMarkers([{ id: 'm1', label: 'Marker', symbol: 'pin', isVisible: true }])
    const { eb, dp } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(SET_ACTIVE, { id: 'm1' })) // NOSONAR
    expect(dp).toHaveBeenCalledWith({
      type: 'SELECT_MARKER',
      payload: { markerId: 'm1', multiSelect: false }
    })
  })

  it('dispatches TOGGLE_SELECTED_FEATURES when id matches a feature', () => {
    const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'High St' }, geometry: { type: 'Point' } }
    ]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(SET_ACTIVE, { id: '1' })) // NOSONAR
    expect(dp).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_FEATURES',
      payload: {
        featureId: '1',
        multiSelect: false,
        replaceAll: true,
        layerId: 'roads',
        idProperty: 'road_id',
        properties: { road_id: '1', road_name: 'High St' },
        geometry: { type: 'Point' }
      }
    })
  })

  it('does not dispatch when feature id is not found in visible features', () => {
    const layers = [{ layerId: 'roads', idProperty: 'road_id' }]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider([])
    })
    act(() => eb.emit(SET_ACTIVE, { id: 'missing' })) // NOSONAR
    expect(dp).not.toHaveBeenCalled()
  })
})
