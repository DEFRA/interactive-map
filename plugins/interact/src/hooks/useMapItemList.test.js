import { renderHook, act } from '@testing-library/react'
import { useMapItemList } from './useMapItemList.js'

const MARKER_LABEL = 'Marker One'

const MOVE_END = 'map:moveend'
const DATA_CHANGE = 'map:datachange'
const SET_FEATURES = 'map:setfeatures'
const SET_ACTIVE = 'map:setactivefeature'
const CONFIRM = 'map:selectfeature'

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

const setup = ({ interactionModes = [], markers, layers = [], mapProvider, eventBus, dispatch, multiSelect = false } = {}) => {
  const eb = eventBus ?? makeEventBus()
  const mp = mapProvider ?? makeMapProvider()
  const dp = dispatch ?? jest.fn()
  const { result, unmount } = renderHook(() => useMapItemList({
    mapState: { markers: markers ?? makeMarkers() },
    pluginState: { interactionModes, layers, dispatch: dp, multiSelect },
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

  it('subscribes to map:datachange on mount', () => {
    const { eb } = setup()
    expect(eb.on).toHaveBeenCalledWith(DATA_CHANGE, expect.any(Function))
  })

  it('unsubscribes from map:moveend on unmount', () => {
    const { eb, unmount } = setup()
    unmount()
    expect(eb.off).toHaveBeenCalledWith(MOVE_END, expect.any(Function))
  })

  it('unsubscribes from map:datachange on unmount', () => {
    const { eb, unmount } = setup()
    unmount()
    expect(eb.off).toHaveBeenCalledWith(DATA_CHANGE, expect.any(Function))
  })
})

// ─── useMapItemList — datachange trigger ─────────────────────────────────

describe('useMapItemList — datachange trigger', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('re-emits items on map:datachange the same as map:moveend', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: MARKER_LABEL, symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(DATA_CHANGE, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: 'm1', label: MARKER_LABEL }], multiselectable: false
    })
    container.remove()
  })
})

// ─── useMapItemList — selectMarker mode ───────────────────────────────────

describe('useMapItemList — selectMarker mode', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('emits visible markers as items on moveend', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: MARKER_LABEL, symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: 'm1', label: MARKER_LABEL }], multiselectable: false
    })
    container.remove()
  })

  it('excludes markers outside the viewport', () => {
    const { el, container } = makeMarkerEl({ inViewport: false })
    const markers = makeMarkers([{ id: 'm1', label: 'Offscreen', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
    container.remove()
  })

  it('excludes standalone label markers', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', label: 'Label', symbol: null, isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
    container.remove()
  })

  it('excludes markers without a label', () => {
    const { el, container } = makeMarkerEl({ inViewport: true })
    const markers = makeMarkers([{ id: 'm1', symbol: 'pin', isVisible: true }])
    markers.markerRefs.set('m1', el)

    const { eb } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(MOVE_END, {}))

    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
    container.remove()
  })
})

// ─── useMapItemList — selectFeature mode: label resolution ───────────────

describe('useMapItemList — selectFeature mode: label resolution', () => {
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
      items: [{ id: '1', label: 'High Street' }], multiselectable: false
    })
  })

  it('falls back to idProperty value when labelProperty is absent on feature', () => {
    const features = [{ layer: { id: 'roads' }, properties: { road_id: '2' } }]
    const { eb } = setup({ interactionModes: ['selectFeature'], layers, mapProvider: makeMapProvider(features) })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: '2', label: '2' }], multiselectable: false
    })
  })

  it('excludes features from layers with no labelProperty configured', () => {
    const features = [{ layer: { id: 'roads' }, properties: { road_id: '3' } }]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers: [{ layerId: 'roads', idProperty: 'road_id' }],
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [], multiselectable: false
    })
  })

  it('excludes features from layers with a label but no labelProperty', () => {
    const features = [{ layer: { id: 'roads' }, properties: { road_id: '4' } }]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers: [{ layerId: 'roads', label: 'Roads', idProperty: 'road_id' }],
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [], multiselectable: false
    })
  })
})

// ─── useMapItemList — selectFeature mode: guards ─────────────────────────

describe('useMapItemList — selectFeature mode: guards', () => {
  const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]

  it('skips features with no matching layer config', () => {
    const features = [{ layer: { id: 'unknown-layer' }, properties: { road_id: '4' } }]
    const { eb } = setup({ interactionModes: ['selectFeature'], layers, mapProvider: makeMapProvider(features) })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
  })

  it('emits empty items when layers array is empty', () => {
    const { eb } = setup({ interactionModes: ['selectFeature'], layers: [] })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
  })

  it('includes multiselectable: true in payload when multiSelect is enabled', () => {
    const features = [{ layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'High St' } }]
    const { eb } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features),
      multiSelect: true
    })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, {
      items: [{ id: '1', label: 'High St' }], multiselectable: true
    })
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
      items: [{ id: 'm1', label: 'A Marker' }, { id: '1', label: 'Main Rd' }], multiselectable: false
    })
    container.remove()
  })

  it('emits empty items when no interaction modes are active', () => {
    const { eb } = setup({ interactionModes: [] })
    act(() => eb.emit(MOVE_END, {}))
    expect(eb.emit).toHaveBeenCalledWith(SET_FEATURES, { items: [], multiselectable: false })
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

  it('dispatches SET_LISTBOX_ACTIVE null when id is null', () => {
    const { eb, dp } = setup({ interactionModes: ['selectMarker'] })
    act(() => eb.emit(SET_ACTIVE, { id: null })) // NOSONAR
    expect(dp).toHaveBeenCalledWith({ type: 'SET_LISTBOX_ACTIVE', payload: null })
  })

  it('dispatches SET_LISTBOX_ACTIVE null when id matches a marker (ring handled by Markers.jsx)', () => {
    const markers = makeMarkers([{ id: 'm1', label: 'Marker', symbol: 'pin', isVisible: true }])
    const { eb, dp } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(SET_ACTIVE, { id: 'm1' })) // NOSONAR
    expect(dp).toHaveBeenCalledWith({ type: 'SET_LISTBOX_ACTIVE', payload: null })
  })

  it('dispatches SET_LISTBOX_ACTIVE with feature payload when id matches a feature', () => {
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
      type: 'SET_LISTBOX_ACTIVE',
      payload: {
        featureId: '1',
        layerId: 'roads',
        idProperty: 'road_id',
        geometry: { type: 'Point' }
      }
    })
  })

  it('preserves raw numeric featureId in SET_LISTBOX_ACTIVE payload (MapLibre filter type-strictness)', () => {
    const layers = [{ layerId: 'hedges', idProperty: 'id' }]
    const features = [
      { layer: { id: 'hedges' }, properties: { id: 27665979 }, geometry: { type: 'LineString' } }
    ]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(SET_ACTIVE, { id: '27665979' }))
    expect(dp).toHaveBeenCalledWith({
      type: 'SET_LISTBOX_ACTIVE',
      payload: {
        featureId: 27665979,
        layerId: 'hedges',
        idProperty: 'id',
        geometry: { type: 'LineString' }
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

// ─── useMapItemList — confirm: lifecycle and guards ──────────────────────

describe('useMapItemList — confirm: lifecycle and guards', () => {
  it('subscribes to map:confirmfeature on mount and unsubscribes on unmount', () => {
    const { eb, unmount } = setup()
    expect(eb.on).toHaveBeenCalledWith(CONFIRM, expect.any(Function))
    unmount()
    expect(eb.off).toHaveBeenCalledWith(CONFIRM, expect.any(Function))
  })

  it('does nothing when no item is active', () => {
    const { eb, dp } = setup()
    act(() => eb.emit(CONFIRM))
    expect(dp).not.toHaveBeenCalled()
  })

  it('keeps the active item after confirm so repeated confirms dispatch again', () => {
    const markers = makeMarkers([{ id: 'm1', label: 'Marker', symbol: 'pin', isVisible: true }])
    const { eb, dp } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(SET_ACTIVE, { id: 'm1' }))
    act(() => eb.emit(CONFIRM))
    dp.mockClear()
    act(() => eb.emit(CONFIRM))
    expect(dp).toHaveBeenCalledWith({ type: 'SELECT_MARKER', payload: { markerId: 'm1', multiSelect: false } })
  })
})

// ─── useMapItemList — confirm: dispatches ────────────────────────────────

describe('useMapItemList — confirm: marker dispatches', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('dispatches TOGGLE_SELECTED_MARKERS after activating a marker', () => {
    const markers = makeMarkers([{ id: 'm1', label: 'Marker', symbol: 'pin', isVisible: true }])
    const { eb, dp } = setup({ interactionModes: ['selectMarker'], markers })
    act(() => eb.emit(SET_ACTIVE, { id: 'm1' }))
    act(() => eb.emit(CONFIRM))
    expect(dp).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_MARKERS',
      payload: { markerId: 'm1', multiSelect: false }
    })
  })
})

describe('useMapItemList — confirm: feature dispatches', () => {
  it('dispatches TOGGLE_SELECTED_FEATURES after activating a feature', () => {
    const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'High St' }, geometry: { type: 'Point' } }
    ]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(SET_ACTIVE, { id: '1' }))
    act(() => eb.emit(CONFIRM))
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

  it('dispatches with multiSelect: true and replaceAll: false when plugin multiSelect is enabled', () => {
    const layers = [{ layerId: 'roads', idProperty: 'road_id', labelProperty: 'road_name' }]
    const features = [
      { layer: { id: 'roads' }, properties: { road_id: '1', road_name: 'High St' }, geometry: { type: 'Point' } }
    ]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features),
      multiSelect: true
    })
    act(() => eb.emit(SET_ACTIVE, { id: '1' }))
    act(() => eb.emit(CONFIRM))
    expect(dp).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_FEATURES',
      payload: expect.objectContaining({ multiSelect: true, replaceAll: false })
    })
  })

  it('preserves raw numeric featureId in TOGGLE_SELECTED_FEATURES payload', () => {
    const layers = [{ layerId: 'hedges', idProperty: 'id' }]
    const features = [
      { layer: { id: 'hedges' }, properties: { id: 27665979 }, geometry: { type: 'LineString' } }
    ]
    const { eb, dp } = setup({
      interactionModes: ['selectFeature'],
      layers,
      mapProvider: makeMapProvider(features)
    })
    act(() => eb.emit(SET_ACTIVE, { id: '27665979' }))
    act(() => eb.emit(CONFIRM))
    expect(dp).toHaveBeenCalledWith({
      type: 'TOGGLE_SELECTED_FEATURES',
      payload: {
        featureId: 27665979,
        multiSelect: false,
        replaceAll: true,
        layerId: 'hedges',
        idProperty: 'id',
        properties: { id: 27665979 },
        geometry: { type: 'LineString' }
      }
    })
  })
})
