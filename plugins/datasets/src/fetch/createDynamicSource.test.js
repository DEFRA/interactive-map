import { createDynamicSource } from './createDynamicSource.js'
import { fetchGeoJSON } from './fetchGeoJSON.js'

jest.mock('./fetchGeoJSON.js', () => ({
  fetchGeoJSON: jest.fn()
}))

// ─── helpers ─────────────────────────────────────────────────────────────────

const DEBOUNCE_DELAY = 200

// Minimal mapProvider stub: getBounds()/getZoom() live on the provider (as they do on both
// MapLibreProvider and OpenLayersProvider), while 'moveend' is subscribed on the raw map —
// tracks a mutable bbox/zoom and the registered moveend handler.
const makeMapProvider = ({ bbox = [-1, -1, 1, 1], zoom = 10 } = {}) => {
  const state = { bbox, zoom }
  const handlers = {}
  return {
    getZoom: jest.fn(() => state.zoom),
    getBounds: jest.fn(() => state.bbox),
    map: {
      on: jest.fn((event, handler) => { handlers[event] = handler }),
      off: jest.fn()
    },
    pan (bbox) { state.bbox = bbox },
    fireMoveEnd () { handlers.moveend?.() }
  }
}

const featureCollection = (features) => ({ type: 'FeatureCollection', features })

// Without an idProperty, every fetch passes onUpdate every feature held
const heldCount = (onUpdate) => onUpdate.mock.calls.at(-1)[1].features.length

// Point feature - its bbox collapses to the point itself, handy for in/out-of-viewport tests
const makePointFeature = (id, [x, y], properties = {}) => ({
  type: 'Feature',
  id,
  properties,
  geometry: { type: 'Point', coordinates: [x, y] }
})

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const advanceDebounce = async () => {
  jest.advanceTimersByTime(DEBOUNCE_DELAY)
  await flushMicrotasks()
}

const makeDynamicGeoJSON = (overrides = {}) => ({
  id: 'test-source',
  url: 'https://api.example.com/features',
  transformRequest: jest.fn((url, context) => ({ url: `${url}?bbox=${context.bbox.join(',')}` })),
  ...overrides
})

beforeEach(() => {
  jest.useFakeTimers()
  fetchGeoJSON.mockReset()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.useRealTimers()
  console.warn.mockRestore()
  console.error.mockRestore()
})

// ─── tests ─────────────────────────────────────────────────────────────────

describe('createDynamicSource', () => {
  it('fetches the initial viewport on creation and passes its features to onChange', async () => {
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1], zoom: 10 })
    const onChange = jest.fn()
    const dynamicGeoJSON = makeDynamicGeoJSON({ idProperty: 'featureId' })
    const feature = makePointFeature('ignored', [0, 0], { featureId: 'abc' })
    // No featureId in properties - falls back to feature.id despite idProperty being configured
    const featureWithoutIdProperty = makePointFeature('fallback-id', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([feature, featureWithoutIdProperty]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate: jest.fn(), onChange })
    await flushMicrotasks()

    expect(fetchGeoJSON).toHaveBeenCalledWith(
      dynamicGeoJSON.url,
      { bbox: [-1, -1, 1, 1], zoom: 10 },
      dynamicGeoJSON.transformRequest,
      expect.anything()
    )
    expect(onChange).toHaveBeenCalledWith('test-source', { add: [feature, featureWithoutIdProperty], remove: [] })
  })

  it('passes onUpdate the whole cache when there\'s no idProperty to remove features by', async () => {
    const onUpdate = jest.fn()
    const feature = makePointFeature('a', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([feature]))

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate, onChange: jest.fn() })
    await flushMicrotasks()

    expect(onUpdate).toHaveBeenCalledWith('test-source', featureCollection([feature]))
  })

  it('falls back to feature.id when no idProperty is configured, and skips features with no resolvable id', async () => {
    const mapProvider = makeMapProvider()
    const onUpdate = jest.fn()
    const dynamicGeoJSON = makeDynamicGeoJSON()
    const withId = makePointFeature('has-id', [0, 0])
    const withoutId = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } }
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([withId, withoutId]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate })
    await flushMicrotasks()

    expect(heldCount(onUpdate)).toBe(1)
    expect(console.warn).toHaveBeenCalledWith('Feature missing ID, skipping:', withoutId)
  })

  it('skips fetching below minZoom, and destroy() is a no-op with no in-flight request', async () => {
    const mapProvider = makeMapProvider({ zoom: 2 })
    const dynamicGeoJSON = makeDynamicGeoJSON({ minZoom: 5 })

    const instance = createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()

    expect(fetchGeoJSON).not.toHaveBeenCalled()
    expect(() => instance.destroy()).not.toThrow()
    expect(mapProvider.map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
  })

  it('skips re-fetching when the new viewport is already covered by the last fetch', async () => {
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()

    mapProvider.pan([-0.5, -0.5, 0.5, 0.5]) // fully inside the fetched bbox
    mapProvider.fireMoveEnd()
    await advanceDebounce()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid map movement into a single re-fetch', async () => {
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON()
    fetchGeoJSON.mockResolvedValue(featureCollection([]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()

    mapProvider.pan([10, 10, 12, 12])
    mapProvider.fireMoveEnd()
    jest.advanceTimersByTime(50)
    mapProvider.fireMoveEnd()
    jest.advanceTimersByTime(50)
    mapProvider.fireMoveEnd()
    await advanceDebounce()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(2) // initial + one debounced re-fetch
  })

  it('aborts the previous in-flight request when a new viewport is fetched before it resolves', async () => {
    let resolveFirst
    fetchGeoJSON.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()
    const firstSignal = fetchGeoJSON.mock.calls[0][3]
    expect(firstSignal.aborted).toBe(false)

    fetchGeoJSON.mockResolvedValueOnce(featureCollection([]))
    mapProvider.pan([10, 10, 12, 12])
    mapProvider.fireMoveEnd()
    await advanceDebounce()

    expect(firstSignal.aborted).toBe(true)
    resolveFirst(featureCollection([]))
  })

  it('evicts least-recently-seen features once over the maxFeatures threshold, out-of-view first then in-view', async () => {
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON({ maxFeatures: 1 })
    const onUpdate = jest.fn()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('a', [0, 0])]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate })
    await flushMicrotasks()
    expect(heldCount(onUpdate)).toBe(1) // under threshold (1 <= 1 * 1.2), no eviction yet

    // New viewport, far from 'a': one in-view feature pushes total to 2 (> 1 * 1.2).
    // Evicting the single out-of-view feature ('a') alone reaches the target, so the
    // in-view eviction pass is skipped.
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('b', [10, 10])]))
    mapProvider.pan([10, 10, 12, 12])
    mapProvider.fireMoveEnd()
    await advanceDebounce()
    expect(heldCount(onUpdate)).toBe(1)

    // New viewport again, far from 'b': two in-view features push total to 3 (> 1 * 1.2).
    // 'b' is out-of-view and evicted first; still over target, so the least-recently-seen
    // in-view feature ('c') is evicted next, leaving only 'd'.
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([
      makePointFeature('c', [20, 20]),
      makePointFeature('d', [21, 21])
    ]))
    mapProvider.pan([20, 20, 22, 22])
    mapProvider.fireMoveEnd()
    await advanceDebounce()
    expect(heldCount(onUpdate)).toBe(1)
  })

  it('sorts multiple out-of-view features by lastSeenAt when evicting', async () => {
    const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON({ maxFeatures: 2 })
    const onUpdate = jest.fn()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([
      makePointFeature('a', [0, 0]),
      makePointFeature('b', [0.5, 0.5])
    ]))

    createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate })
    await flushMicrotasks()
    expect(heldCount(onUpdate)).toBe(2) // under threshold (2 <= 2 * 1.2), no eviction yet

    // New viewport, far from 'a' and 'b': both become out-of-view at once, exercising the
    // out-of-view sort-by-lastSeenAt comparator (a no-op array has nothing to compare)
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('c', [10, 10])]))
    mapProvider.pan([10, 10, 12, 12])
    mapProvider.fireMoveEnd()
    await advanceDebounce()

    expect(heldCount(onUpdate)).toBe(2) // one of a/b evicted, 'c' kept
  })

  it('swallows AbortError from the fetch without logging', async () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' })
    fetchGeoJSON.mockRejectedValueOnce(error)
    const onUpdate = jest.fn()

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate })
    await flushMicrotasks()

    expect(console.error).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('logs unexpected fetch errors', async () => {
    const error = new Error('network down')
    fetchGeoJSON.mockRejectedValueOnce(error)

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate: jest.fn() })
    await flushMicrotasks()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch dynamic GeoJSON for test-source'),
      error
    )
  })

  it('destroy() unregisters moveend, cancels the pending debounce, and aborts the in-flight request', async () => {
    fetchGeoJSON.mockImplementationOnce(() => new Promise(() => {})) // never resolves
    const mapProvider = makeMapProvider()

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()
    const signal = fetchGeoJSON.mock.calls[0][3]

    mapProvider.fireMoveEnd() // schedule a debounced re-fetch
    instance.destroy()

    expect(mapProvider.map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(signal.aborted).toBe(true)

    await advanceDebounce()
    expect(fetchGeoJSON).toHaveBeenCalledTimes(1) // debounced call never fired
  })

  it('unregisters moveend via un() when the raw map has no off() (OpenLayers)', async () => {
    const mapProvider = makeMapProvider()
    mapProvider.map.un = jest.fn()
    delete mapProvider.map.off

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider, onUpdate: jest.fn() })
    await flushMicrotasks()
    instance.destroy()

    expect(mapProvider.map.un).toHaveBeenCalledWith('moveend', expect.any(Function))
  })

  it('refresh() clears the cache and re-fetches the current viewport', async () => {
    const onUpdate = jest.fn()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('a', [0, 0])]))
    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate })
    await flushMicrotasks()

    const b = makePointFeature('b', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([b]))
    instance.refresh()
    await flushMicrotasks()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(2)
    expect(onUpdate).toHaveBeenLastCalledWith('test-source', featureCollection([b]))
  })

  it('reapply() re-pushes cached features, and does nothing when the cache is empty', async () => {
    const onUpdate = jest.fn()
    const onEmptyUpdate = jest.fn()
    const feature = makePointFeature('a', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([feature])).mockResolvedValueOnce(featureCollection([]))

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate })
    const emptyInstance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), mapProvider: makeMapProvider(), onUpdate: onEmptyUpdate })
    await flushMicrotasks()
    onUpdate.mockClear()
    onEmptyUpdate.mockClear()

    instance.reapply()
    emptyInstance.reapply()
    expect(onUpdate).toHaveBeenCalledWith('test-source', featureCollection([feature]))
    expect(onEmptyUpdate).not.toHaveBeenCalled()
  })

  describe('with an idProperty, passing only what changed', () => {
    const parcel = (ref, position) => makePointFeature(undefined, position, { ref })
    const setup = (overrides = {}) => {
      const mapProvider = makeMapProvider({ bbox: [-1, -1, 1, 1] })
      const onUpdate = jest.fn()
      const onChange = jest.fn()
      const dynamicGeoJSON = makeDynamicGeoJSON({ idProperty: 'ref', ...overrides })
      const instance = createDynamicSource({ dynamicGeoJSON, mapProvider, onUpdate, onChange })
      const moveTo = async (bbox) => {
        mapProvider.pan(bbox)
        mapProvider.fireMoveEnd()
        await advanceDebounce()
      }
      return { instance, onUpdate, onChange, moveTo }
    }

    it('passes only new features, keeping the held copy of a feature fetched again', async () => {
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([parcel('a', [0, 0])]))
      const { onChange, moveTo } = setup()
      await flushMicrotasks()

      const b = parcel('b', [10, 10])
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([parcel('a', [0, 0]), b]))
      await moveTo([-1, -1, 12, 12])

      expect(onChange).toHaveBeenLastCalledWith('test-source', { add: [b], remove: [] })
    })

    it('passes nothing when a fetch brings no new features', async () => {
      fetchGeoJSON.mockResolvedValue(featureCollection([parcel('a', [0, 0])]))
      const { onChange, moveTo } = setup()
      await flushMicrotasks()

      await moveTo([-1, -1, 12, 12])

      expect(fetchGeoJSON).toHaveBeenCalledTimes(2)
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('passes the IDs of evicted features to remove, leaving out features added and evicted together', async () => {
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([parcel('a', [0, 0])]))
      const { onChange, moveTo } = setup({ maxFeatures: 1 })
      await flushMicrotasks()

      const b = parcel('b', [10, 10])
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([b]))
      await moveTo([10, 10, 12, 12])
      expect(onChange).toHaveBeenLastCalledWith('test-source', { add: [b], remove: ['a'] })

      // 'b' is evicted, then 'c', the least recently seen of the two new features
      const d = parcel('d', [21, 21])
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([parcel('c', [20, 20]), d]))
      await moveTo([20, 20, 22, 22])
      expect(onChange).toHaveBeenLastCalledWith('test-source', { add: [d], remove: ['b'] })
    })

    it('replaces the map\'s data on the first fetch after refresh(), then passes changes again', async () => {
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([parcel('a', [0, 0])]))
      const { instance, onUpdate, onChange, moveTo } = setup()
      await flushMicrotasks()

      const reloaded = parcel('a', [0, 0])
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([reloaded]))
      instance.refresh()
      await flushMicrotasks()
      expect(onUpdate).toHaveBeenCalledWith('test-source', featureCollection([reloaded]))

      const b = parcel('b', [10, 10])
      fetchGeoJSON.mockResolvedValueOnce(featureCollection([b]))
      await moveTo([-1, -1, 12, 12])
      expect(onChange).toHaveBeenLastCalledWith('test-source', { add: [b], remove: [] })
    })
  })
})
