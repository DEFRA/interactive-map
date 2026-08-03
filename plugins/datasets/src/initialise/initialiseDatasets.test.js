import { initialiseDatasets } from './initialiseDatasets.js'
import { createDynamicSource } from '../fetch/createDynamicSource.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'

jest.mock('../fetch/createDynamicSource.js')
jest.mock('../registry/datasetRegistry.js', () => ({
  datasetRegistry: {
    attach: jest.fn(),
    attachCreateDataset: jest.fn(),
    forEachDataset: jest.fn(),
    _invalidateCache: jest.fn()
  }
}))

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeAdapter = (overrides = {}) => ({
  init: jest.fn().mockResolvedValue(undefined),
  attachDynamicSources: jest.fn(),
  onMapStyleChange: jest.fn(),
  onMapSizeChange: jest.fn(),
  setData: jest.fn(),
  destroy: jest.fn(),
  createDataset: jest.fn(),
  ...overrides
})

const makeEventBus = () => {
  const handlers = {}
  return {
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    off: jest.fn(),
    emit: jest.fn(),
    _handlers: handlers
  }
}

const makeArgs = (overrides = {}) => {
  const eventBus = makeEventBus()
  return {
    adapter: makeAdapter(),
    pluginConfig: { datasets: [{ id: 'roads', label: 'Roads' }] },
    pluginStateRef: {},
    mapStyle: { layers: [] },
    mapProvider: { map: {} },
    events: { MAP_SIZE_CHANGE: 'map:sizeChange' },
    dispatch: jest.fn(),
    eventBus,
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  datasetRegistry.forEachDataset.mockImplementation(() => {})
})

// ─── initialisation ──────────────────────────────────────────────────────────

describe('initialiseDatasets', () => {
  it('calls adapter.init with mapStyle', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    expect(args.adapter.init).toHaveBeenCalledWith()
  })

  it('attaches mappedDatasets to datasetRegistry', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    expect(datasetRegistry.attach).toHaveBeenCalled()
  })

  it('attaches adapter.createDataset to datasetRegistry when provided', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    expect(datasetRegistry.attachCreateDataset).toHaveBeenCalledWith(args.adapter.createDataset)
  })

  it('does not call attachCreateDataset when adapter has no createDataset', () => {
    const args = makeArgs({ adapter: makeAdapter({ createDataset: undefined }) })
    initialiseDatasets(args)
    expect(datasetRegistry.attachCreateDataset).not.toHaveBeenCalled()
  })

  it('dispatches SET_GLOBAL_STATE when pluginConfig.globals is provided', () => {
    const globals = { opacity: 0.8 }
    const args = makeArgs({ pluginConfig: { datasets: [], globals } })
    initialiseDatasets(args)
    expect(args.dispatch).toHaveBeenCalledWith({ type: 'SET_GLOBAL_STATE', payload: globals })
  })

  it('does not dispatch SET_GLOBAL_STATE when pluginConfig.globals is absent', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    expect(args.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_GLOBAL_STATE' }))
  })

  it('registers MAP_SET_STYLE event listeners', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    expect(args.eventBus.on).toHaveBeenCalledWith('map:sizeChange', expect.any(Function))
  })

  describe('after adapter.init resolves', () => {
    it('dispatches SET_DATASETS', async () => {
      const args = makeArgs()
      initialiseDatasets(args)
      await Promise.resolve() // flush microtask
      expect(args.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_DATASETS' }))
    })

    it('emits datasets:ready', async () => {
      const args = makeArgs()
      initialiseDatasets(args)
      await Promise.resolve()
      expect(args.eventBus.emit).toHaveBeenCalledWith('datasets:ready')
    })

    it('creates dynamic sources for datasets with dynamicGeoJSON', async () => {
      const mockDynamicSource = { destroy: jest.fn(), refresh: jest.fn(), clear: jest.fn(), getFeatureCount: jest.fn() }
      createDynamicSource.mockReturnValue(mockDynamicSource)

      const dynamicDataset = {
        id: 'parcels',
        hasDynamicGeoJSON: true,
        dynamicGeoJSON: { url: 'http://example.com/geojson', idProperty: 'id' }
      }
      datasetRegistry.forEachDataset.mockImplementation(cb => cb(dynamicDataset))

      const args = makeArgs()
      initialiseDatasets(args)
      await Promise.resolve()

      expect(createDynamicSource).toHaveBeenCalledWith(expect.objectContaining({
        dynamicGeoJSON: dynamicDataset.dynamicGeoJSON,
        map: args.mapProvider.map
      }))
    })

    it('does not create dynamic sources for datasets without dynamicGeoJSON', async () => {
      const nonDynamicDataset = { id: 'roads', hasDynamicGeoJSON: false }
      datasetRegistry.forEachDataset.mockImplementation(cb => cb(nonDynamicDataset))

      const args = makeArgs()
      initialiseDatasets(args)
      await Promise.resolve()

      expect(createDynamicSource).not.toHaveBeenCalled()
    })
  })
})

// ─── event handlers ───────────────────────────────────────────────────────────

describe('event handlers', () => {
  it('delegates MAP_SIZE_CHANGE to adapter.onMapSizeChange with current mapStyle', () => {
    const args = makeArgs()
    initialiseDatasets(args)
    args.eventBus._handlers['map:sizeChange']()
    expect(args.adapter.onMapSizeChange).toHaveBeenCalled()
  })
})

// ─── returned API ─────────────────────────────────────────────────────────────

describe('returned API', () => {
  it('remove() unregisters event listeners and destroys adapter', () => {
    const args = makeArgs()
    const instance = initialiseDatasets(args)
    instance.remove()
    expect(args.eventBus.off).toHaveBeenCalledWith('map:sizeChange', expect.any(Function))
    expect(args.adapter.destroy).toHaveBeenCalled()
  })

  it('remove() destroys all dynamic sources', async () => {
    const mockSource = { destroy: jest.fn(), refresh: jest.fn(), clear: jest.fn(), getFeatureCount: jest.fn() }
    createDynamicSource.mockReturnValue(mockSource)
    const mockDataset = { id: 'parcels', hasDynamicGeoJSON: true, dynamicGeoJSON: { url: 'http://x.com', idProperty: 'id' } }
    datasetRegistry.forEachDataset.mockImplementation(cb =>
      cb(mockDataset)
    )

    const args = makeArgs()
    const instance = initialiseDatasets(args)
    await Promise.resolve()
    instance.remove()

    expect(mockSource.destroy).toHaveBeenCalled()
  })

  it('refreshDataset() calls refresh on the matching dynamic source', async () => {
    const mockSource = { destroy: jest.fn(), refresh: jest.fn(), clear: jest.fn(), getFeatureCount: jest.fn() }
    createDynamicSource.mockReturnValue(mockSource)
    const mockDataset = { id: 'parcels', hasDynamicGeoJSON: true, dynamicGeoJSON: { url: 'http://x.com', idProperty: 'id' } }
    datasetRegistry.forEachDataset.mockImplementation(cb =>
      cb(mockDataset)
    )

    const args = makeArgs()
    const instance = initialiseDatasets(args)
    await Promise.resolve()
    instance.refreshDataset('parcels')

    expect(mockSource.refresh).toHaveBeenCalled()
  })

  it('clearDatasetCache() calls clear on the matching dynamic source', async () => {
    const mockSource = { destroy: jest.fn(), refresh: jest.fn(), clear: jest.fn(), getFeatureCount: jest.fn() }
    createDynamicSource.mockReturnValue(mockSource)
    const mockDataset = { id: 'parcels', hasDynamicGeoJSON: true, dynamicGeoJSON: { url: 'http://x.com', idProperty: 'id' } }
    datasetRegistry.forEachDataset.mockImplementation(cb =>
      cb(mockDataset)
    )

    const args = makeArgs()
    const instance = initialiseDatasets(args)
    await Promise.resolve()
    instance.clearDatasetCache('parcels')

    expect(mockSource.clear).toHaveBeenCalled()
  })

  it('getFeatureCount() returns the count from the matching dynamic source', async () => {
    const mockSource = { destroy: jest.fn(), refresh: jest.fn(), clear: jest.fn(), getFeatureCount: jest.fn().mockReturnValue(42) }
    createDynamicSource.mockReturnValue(mockSource)
    const mockDataset = { id: 'parcels', hasDynamicGeoJSON: true, dynamicGeoJSON: { url: 'http://x.com', idProperty: 'id' } }
    datasetRegistry.forEachDataset.mockImplementation(cb =>
      cb(mockDataset)
    )

    const args = makeArgs()
    const instance = initialiseDatasets(args)
    await Promise.resolve()

    expect(instance.getFeatureCount('parcels')).toBe(42)
  })

  it('getFeatureCount() returns null for a non-dynamic dataset', () => {
    const args = makeArgs()
    const instance = initialiseDatasets(args)
    expect(instance.getFeatureCount('unknown')).toBeNull()
  })

  it('refreshDataset() does nothing for a non-dynamic dataset', () => {
    const args = makeArgs()
    const instance = initialiseDatasets(args)
    expect(() => instance.refreshDataset('unknown')).not.toThrow()
  })

  it('clearDatasetCache() does nothing for a non-dynamic dataset', () => {
    const args = makeArgs()
    const instance = initialiseDatasets(args)
    expect(() => instance.clearDatasetCache('unknown')).not.toThrow()
  })
})
