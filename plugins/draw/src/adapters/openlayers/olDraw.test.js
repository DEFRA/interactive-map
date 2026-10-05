import { createOLDraw } from './olDraw.js'
import { OLDrawManager } from './core/OLDrawManager.js'
import { refreshAllPointSymbols } from './point/pointSymbolImages.js'
import { logger } from '../../../../../src/services/logger.js'

jest.mock('./core/OLDrawManager.js', () => ({
  OLDrawManager: jest.fn(function () {
    this.setMapStyle = jest.fn()
    this.remove = jest.fn()
  })
}))
jest.mock('./point/pointSymbolImages.js', () => ({ refreshAllPointSymbols: jest.fn(() => Promise.resolve()) }))
jest.mock('../../../../../src/services/logger.js', () => ({ logger: { error: jest.fn() } }))

const symbolRegistry = { id: 'app-symbol-registry' }
const events = { MAP_SET_PIXEL_RATIO: 'app:pixelratio', MAP_SET_STYLE: 'app:style', MAP_DATA_CHANGE: 'app:datachange' }

const setup = (mapStyle = null) => {
  const listeners = {}
  const eventBus = {
    on: jest.fn((type, handler) => { listeners[type] = handler }),
    off: jest.fn(),
    emit: jest.fn((type, payload) => listeners[type]?.(payload))
  }
  const mapProvider = { map: { id: 'ol-map' } }
  const olDraw = createOLDraw({ mapProvider, symbolRegistry, events, eventBus, pluginConfig: { snapRadius: 5 }, mapStyle })
  const manager = OLDrawManager.mock.instances.at(-1)
  return { eventBus, mapProvider, olDraw, manager }
}

afterEach(() => jest.clearAllMocks())

test('creates the manager for the map, exposes it as mapProvider.draw and applies an initial style', () => {
  const { mapProvider, manager } = setup({ id: 'dark' })
  // the provider and the app's registry, for resolving drawn points' symbols
  expect(OLDrawManager).toHaveBeenCalledWith(mapProvider.map, { snapRadius: 5 }, { mapProvider, symbolRegistry })
  expect(mapProvider.draw).toBe(manager)
  expect(manager.setMapStyle).toHaveBeenCalledWith({ id: 'dark' })

  expect(setup().manager.setMapStyle).not.toHaveBeenCalled() // no initial style
})

// Point symbols are rasterised at the map's own pixelRatio (see point/pointSymbolImages.js's
// getPixelRatio), which the map is created with — so a map that loads straight at medium/large
// is already right. A runtime map-size change sets a new ratio, which re-resolves them.
test('pixel ratio changes re-resolve point symbols at the new ratio carried by the event', () => {
  const { eventBus, mapProvider, manager } = setup()
  eventBus.emit(events.MAP_SET_PIXEL_RATIO, 3)
  expect(refreshAllPointSymbols).toHaveBeenCalledWith({ manager, mapProvider, pixelRatioOverride: 3 })
})

// A selected point's highlight overlay only re-applies on MAP_DATA_CHANGE, and (unlike
// MapLibre) OL's own MAP_DATA_CHANGE is driven purely by basemap 'tileloadend' — nothing
// ties it to the draw VectorSource, so without this explicit nudge a resize/style change
// with no tiles loading would never re-trigger the highlight refresh at all, leaving an
// already-selected point's ring stuck on its old (now wrong-resolution) icon.
test('emits MAP_DATA_CHANGE once point symbols have actually finished re-resolving after a size change', async () => {
  const { eventBus, manager, mapProvider } = setup()
  eventBus.emit(events.MAP_SET_PIXEL_RATIO, 4)
  await Promise.resolve() // flush the refreshAllPointSymbols().then(...) microtask
  expect(refreshAllPointSymbols).toHaveBeenCalledWith({ manager, mapProvider, pixelRatioOverride: 4 })
  expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_DATA_CHANGE)
})

test('logs, rather than leaving unhandled, a failure to refresh point symbols', async () => {
  const { eventBus } = setup()
  const failure = new Error('rasterise failed')
  refreshAllPointSymbols.mockReturnValueOnce(Promise.reject(failure))
  eventBus.emit(events.MAP_SET_PIXEL_RATIO, 2)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(logger.error).toHaveBeenCalledWith('[draw] failed to refresh point symbols', failure)
  expect(eventBus.emit).not.toHaveBeenCalledWith(events.MAP_DATA_CHANGE)
})

test('pluginConfig and mapStyle are optional, defaulting to {} and no initial style', () => {
  const eventBus = { on: jest.fn(), off: jest.fn() }
  const mapProvider = { map: { id: 'ol-map' } }
  const olDraw = createOLDraw({ mapProvider, events, eventBus }) // no pluginConfig, no mapStyle
  const manager = OLDrawManager.mock.instances.at(-1)
  expect(OLDrawManager).toHaveBeenCalledWith(mapProvider.map, {}, { mapProvider, symbolRegistry: undefined })
  expect(manager.setMapStyle).not.toHaveBeenCalled()
  expect(mapProvider.draw).toBe(manager)
  olDraw.remove()
})

test('map style changes are forwarded to the manager and re-resolve point symbols', () => {
  const { eventBus, manager, mapProvider } = setup()
  eventBus.emit(events.MAP_SET_STYLE, { id: 'dark' })
  expect(manager.setMapStyle).toHaveBeenCalledWith({ id: 'dark' })
  expect(refreshAllPointSymbols).toHaveBeenCalledWith({ manager, mapProvider })
})

test('emits MAP_DATA_CHANGE once point symbols have actually finished re-resolving after a style change', async () => {
  const { eventBus } = setup()
  eventBus.emit(events.MAP_SET_STYLE, { id: 'dark' })
  await Promise.resolve()
  expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_DATA_CHANGE)
})

test('remove unsubscribes, destroys the manager and clears mapProvider.draw', () => {
  const { eventBus, mapProvider, olDraw, manager } = setup()
  olDraw.remove()
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_PIXEL_RATIO, expect.any(Function))
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
  expect(manager.remove).toHaveBeenCalled()
  expect(mapProvider.draw).toBeNull()
})
