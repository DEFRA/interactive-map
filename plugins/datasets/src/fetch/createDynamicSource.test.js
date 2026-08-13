import { createDynamicSource } from './createDynamicSource.js'
import { fetchGeoJSON } from './fetchGeoJSON.js'

jest.mock('./fetchGeoJSON.js', () => ({
  fetchGeoJSON: jest.fn()
}))

// ─── helpers ─────────────────────────────────────────────────────────────────

const DEBOUNCE_DELAY = 200

const makeBounds = ([west, south, east, north]) => ({
  getWest: () => west,
  getSouth: () => south,
  getEast: () => east,
  getNorth: () => north
})

// Minimal map stub: tracks a mutable bbox/zoom and the registered moveend handler
const makeMap = ({ bbox = [-1, -1, 1, 1], zoom = 10 } = {}) => {
  const state = { bbox, zoom }
  const handlers = {}
  return {
    getZoom: jest.fn(() => state.zoom),
    getBounds: jest.fn(() => makeBounds(state.bbox)),
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    off: jest.fn(),
    pan (bbox) { state.bbox = bbox },
    fireMoveEnd () { handlers.moveend?.() }
  }
}

const featureCollection = (features) => ({ type: 'FeatureCollection', features })

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
  it('fetches the initial viewport on creation and pushes features to onUpdate', async () => {
    const map = makeMap({ bbox: [-1, -1, 1, 1], zoom: 10 })
    const onUpdate = jest.fn()
    const dynamicGeoJSON = makeDynamicGeoJSON({ idProperty: 'featureId' })
    const feature = makePointFeature('ignored', [0, 0], { featureId: 'abc' })
    // No featureId in properties - falls back to feature.id despite idProperty being configured
    const featureWithoutIdProperty = makePointFeature('fallback-id', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([feature, featureWithoutIdProperty]))

    const instance = createDynamicSource({ dynamicGeoJSON, map, onUpdate })
    await flushMicrotasks()

    expect(fetchGeoJSON).toHaveBeenCalledWith(
      dynamicGeoJSON.url,
      { bbox: [-1, -1, 1, 1], zoom: 10 },
      dynamicGeoJSON.transformRequest,
      expect.anything()
    )
    expect(instance.getFeatureCount()).toBe(2)
    expect(onUpdate).toHaveBeenCalledWith('test-source', featureCollection([feature, featureWithoutIdProperty]))
  })

  it('falls back to feature.id when no idProperty is configured, and skips features with no resolvable id', async () => {
    const map = makeMap()
    const onUpdate = jest.fn()
    const dynamicGeoJSON = makeDynamicGeoJSON()
    const withId = makePointFeature('has-id', [0, 0])
    const withoutId = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } }
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([withId, withoutId]))

    const instance = createDynamicSource({ dynamicGeoJSON, map, onUpdate })
    await flushMicrotasks()

    expect(instance.getFeatureCount()).toBe(1)
    expect(console.warn).toHaveBeenCalledWith('Feature missing ID, skipping:', withoutId)
  })

  it('skips fetching below minZoom, and destroy() is a no-op with no in-flight request', async () => {
    const map = makeMap({ zoom: 2 })
    const dynamicGeoJSON = makeDynamicGeoJSON({ minZoom: 5 })

    const instance = createDynamicSource({ dynamicGeoJSON, map, onUpdate: jest.fn() })
    await flushMicrotasks()

    expect(fetchGeoJSON).not.toHaveBeenCalled()
    expect(() => instance.destroy()).not.toThrow()
    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
  })

  it('skips re-fetching when the new viewport is already covered by the last fetch', async () => {
    const map = makeMap({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([]))

    createDynamicSource({ dynamicGeoJSON, map, onUpdate: jest.fn() })
    await flushMicrotasks()

    map.pan([-0.5, -0.5, 0.5, 0.5]) // fully inside the fetched bbox
    map.fireMoveEnd()
    await advanceDebounce()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid map movement into a single re-fetch', async () => {
    const map = makeMap({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON()
    fetchGeoJSON.mockResolvedValue(featureCollection([]))

    createDynamicSource({ dynamicGeoJSON, map, onUpdate: jest.fn() })
    await flushMicrotasks()

    map.pan([10, 10, 12, 12])
    map.fireMoveEnd()
    jest.advanceTimersByTime(50)
    map.fireMoveEnd()
    jest.advanceTimersByTime(50)
    map.fireMoveEnd()
    await advanceDebounce()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(2) // initial + one debounced re-fetch
  })

  it('aborts the previous in-flight request when a new viewport is fetched before it resolves', async () => {
    let resolveFirst
    fetchGeoJSON.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    const map = makeMap({ bbox: [-1, -1, 1, 1] })

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map, onUpdate: jest.fn() })
    await flushMicrotasks()
    const firstSignal = fetchGeoJSON.mock.calls[0][3]
    expect(firstSignal.aborted).toBe(false)

    fetchGeoJSON.mockResolvedValueOnce(featureCollection([]))
    map.pan([10, 10, 12, 12])
    map.fireMoveEnd()
    await advanceDebounce()

    expect(firstSignal.aborted).toBe(true)
    resolveFirst(featureCollection([]))
  })

  it('evicts least-recently-seen features once over the maxFeatures threshold, out-of-view first then in-view', async () => {
    const map = makeMap({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON({ maxFeatures: 1 })
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('a', [0, 0])]))

    const instance = createDynamicSource({ dynamicGeoJSON, map, onUpdate: jest.fn() })
    await flushMicrotasks()
    expect(instance.getFeatureCount()).toBe(1) // under threshold (1 <= 1 * 1.2), no eviction yet

    // New viewport, far from 'a': one in-view feature pushes total to 2 (> 1 * 1.2).
    // Evicting the single out-of-view feature ('a') alone reaches the target, so the
    // in-view eviction pass is skipped.
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('b', [10, 10])]))
    map.pan([10, 10, 12, 12])
    map.fireMoveEnd()
    await advanceDebounce()
    expect(instance.getFeatureCount()).toBe(1)

    // New viewport again, far from 'b': two in-view features push total to 3 (> 1 * 1.2).
    // 'b' is out-of-view and evicted first; still over target, so the least-recently-seen
    // in-view feature ('c') is evicted next, leaving only 'd'.
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([
      makePointFeature('c', [20, 20]),
      makePointFeature('d', [21, 21])
    ]))
    map.pan([20, 20, 22, 22])
    map.fireMoveEnd()
    await advanceDebounce()
    expect(instance.getFeatureCount()).toBe(1)
  })

  it('sorts multiple out-of-view features by lastSeenAt when evicting', async () => {
    const map = makeMap({ bbox: [-1, -1, 1, 1] })
    const dynamicGeoJSON = makeDynamicGeoJSON({ maxFeatures: 2 })
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([
      makePointFeature('a', [0, 0]),
      makePointFeature('b', [0.5, 0.5])
    ]))

    const instance = createDynamicSource({ dynamicGeoJSON, map, onUpdate: jest.fn() })
    await flushMicrotasks()
    expect(instance.getFeatureCount()).toBe(2) // under threshold (2 <= 2 * 1.2), no eviction yet

    // New viewport, far from 'a' and 'b': both become out-of-view at once, exercising the
    // out-of-view sort-by-lastSeenAt comparator (a no-op array has nothing to compare)
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('c', [10, 10])]))
    map.pan([10, 10, 12, 12])
    map.fireMoveEnd()
    await advanceDebounce()

    expect(instance.getFeatureCount()).toBe(2) // one of a/b evicted, 'c' kept
  })

  it('swallows AbortError from the fetch without logging', async () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' })
    fetchGeoJSON.mockRejectedValueOnce(error)
    const onUpdate = jest.fn()

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map: makeMap(), onUpdate })
    await flushMicrotasks()

    expect(console.error).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('logs unexpected fetch errors', async () => {
    const error = new Error('network down')
    fetchGeoJSON.mockRejectedValueOnce(error)

    createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map: makeMap(), onUpdate: jest.fn() })
    await flushMicrotasks()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch dynamic GeoJSON for test-source'),
      error
    )
  })

  it('destroy() unregisters moveend, cancels the pending debounce, and aborts the in-flight request', async () => {
    fetchGeoJSON.mockImplementationOnce(() => new Promise(() => {})) // never resolves
    const map = makeMap()

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map, onUpdate: jest.fn() })
    await flushMicrotasks()
    const signal = fetchGeoJSON.mock.calls[0][3]

    map.fireMoveEnd() // schedule a debounced re-fetch
    instance.destroy()

    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(signal.aborted).toBe(true)

    await advanceDebounce()
    expect(fetchGeoJSON).toHaveBeenCalledTimes(1) // debounced call never fired
  })

  it('clear() empties the cache and pushes an empty FeatureCollection', async () => {
    const onUpdate = jest.fn()
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('a', [0, 0])]))

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map: makeMap(), onUpdate })
    await flushMicrotasks()

    instance.clear()

    expect(instance.getFeatureCount()).toBe(0)
    expect(onUpdate).toHaveBeenLastCalledWith('test-source', featureCollection([]))
  })

  it('refresh() clears the cache and re-fetches the current viewport', async () => {
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('a', [0, 0])]))
    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map: makeMap(), onUpdate: jest.fn() })
    await flushMicrotasks()

    fetchGeoJSON.mockResolvedValueOnce(featureCollection([makePointFeature('b', [0, 0])]))
    instance.refresh()
    await flushMicrotasks()

    expect(fetchGeoJSON).toHaveBeenCalledTimes(2)
    expect(instance.getFeatureCount()).toBe(1)
  })

  it('reapply() re-pushes cached features, and does nothing when the cache is empty', async () => {
    const onUpdate = jest.fn()
    const feature = makePointFeature('a', [0, 0])
    fetchGeoJSON.mockResolvedValueOnce(featureCollection([feature]))

    const instance = createDynamicSource({ dynamicGeoJSON: makeDynamicGeoJSON(), map: makeMap(), onUpdate })
    await flushMicrotasks()
    onUpdate.mockClear()

    instance.reapply()
    expect(onUpdate).toHaveBeenCalledWith('test-source', featureCollection([feature]))

    onUpdate.mockClear()
    instance.clear()
    onUpdate.mockClear()
    instance.reapply()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
