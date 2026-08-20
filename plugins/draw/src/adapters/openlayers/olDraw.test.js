import { createOLDraw } from './olDraw.js'
import { OLDrawManager } from './core/OLDrawManager.js'
import { refreshAllPointSymbols } from './point/pointSymbolImages.js'
import { MAP_SIZE_SCALES } from './defaults.js'

jest.mock('./core/OLDrawManager.js', () => ({
  OLDrawManager: jest.fn(function () {
    this.setMapStyle = jest.fn()
    this.remove = jest.fn()
  })
}))
jest.mock('./point/pointSymbolImages.js', () => ({ refreshAllPointSymbols: jest.fn(() => Promise.resolve()) }))

const events = { MAP_SET_SIZE: 'app:size', MAP_SET_STYLE: 'app:style', MAP_DATA_CHANGE: 'app:datachange' }

const setup = (mapStyle = null) => {
  const listeners = {}
  const eventBus = {
    on: jest.fn((type, handler) => { listeners[type] = handler }),
    off: jest.fn(),
    emit: jest.fn((type, payload) => listeners[type]?.(payload))
  }
  const mapProvider = { map: { id: 'ol-map' } }
  const olDraw = createOLDraw({ mapProvider, events, eventBus, pluginConfig: { snapRadius: 5 }, mapStyle })
  const manager = OLDrawManager.mock.instances.at(-1)
  return { eventBus, mapProvider, olDraw, manager }
}

afterEach(() => jest.clearAllMocks())

test('creates the manager for the map, exposes it as mapProvider.draw and applies an initial style', () => {
  const { mapProvider, manager } = setup({ id: 'dark' })
  expect(OLDrawManager).toHaveBeenCalledWith(mapProvider.map, { snapRadius: 5 })
  expect(mapProvider.draw).toBe(manager)
  expect(manager.setMapStyle).toHaveBeenCalledWith({ id: 'dark' })

  expect(setup().manager.setMapStyle).not.toHaveBeenCalled() // no initial style
})

// Regression: MAP_SET_SIZE only ever fires from the map-size UI control being clicked at
// runtime, so a map that loads directly at medium/large left drawScale unset (defaulting to 1,
// i.e. small) until the user happened to change size — rasterising the first symbol placed at
// the wrong resolution. mapProvider.mapSize already holds the size the map actually loaded at.
test('seeds drawScale from the provider\'s own starting map size, before any size-change event', () => {
  const eventBus = { on: jest.fn(), off: jest.fn() }
  const mapProvider = { map: { id: 'ol-map' }, mapSize: 'large' }
  createOLDraw({ mapProvider, events, eventBus })
  expect(mapProvider.drawScale).toBe(MAP_SIZE_SCALES.large)
})

test('defaults the seeded drawScale to 1 when the provider has no starting map size', () => {
  const eventBus = { on: jest.fn(), off: jest.fn() }
  const mapProvider = { map: { id: 'ol-map' } }
  createOLDraw({ mapProvider, events, eventBus })
  expect(mapProvider.drawScale).toBe(1)
})

test('map size changes update the draw UI scale, defaulting to 1 for unknown sizes, and re-resolve point symbols', async () => {
  const { eventBus, mapProvider, manager } = setup()
  eventBus.emit(events.MAP_SET_SIZE, 'large')
  expect(mapProvider.drawScale).toBe(MAP_SIZE_SCALES.large)
  expect(refreshAllPointSymbols).toHaveBeenCalledWith({ manager, mapProvider })
  eventBus.emit(events.MAP_SET_SIZE, 'enormous')
  expect(mapProvider.drawScale).toBe(1)
})

// A selected point's highlight overlay only re-applies on MAP_DATA_CHANGE, and (unlike
// MapLibre) OL's own MAP_DATA_CHANGE is driven purely by basemap 'tileloadend' — nothing
// ties it to the draw VectorSource, so without this explicit nudge a resize/style change
// with no tiles loading would never re-trigger the highlight refresh at all, leaving an
// already-selected point's ring stuck on its old (now wrong-resolution) icon.
test('emits MAP_DATA_CHANGE once point symbols have actually finished re-resolving after a size change', async () => {
  const { eventBus, manager, mapProvider } = setup()
  eventBus.emit(events.MAP_SET_SIZE, 'large')
  await Promise.resolve() // flush the refreshAllPointSymbols().then(...) microtask
  expect(refreshAllPointSymbols).toHaveBeenCalledWith({ manager, mapProvider })
  expect(eventBus.emit).toHaveBeenCalledWith(events.MAP_DATA_CHANGE)
})

test('pluginConfig and mapStyle are optional, defaulting to {} and no initial style', () => {
  const eventBus = { on: jest.fn(), off: jest.fn() }
  const mapProvider = { map: { id: 'ol-map' } }
  const olDraw = createOLDraw({ mapProvider, events, eventBus }) // no pluginConfig, no mapStyle
  const manager = OLDrawManager.mock.instances.at(-1)
  expect(OLDrawManager).toHaveBeenCalledWith(mapProvider.map, {})
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
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_SIZE, expect.any(Function))
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
  expect(manager.remove).toHaveBeenCalled()
  expect(mapProvider.draw).toBeNull()
})
