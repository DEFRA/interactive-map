import { createOLDraw } from './olDraw.js'
import { OLDrawManager } from './core/OLDrawManager.js'
import { MAP_SIZE_SCALES } from './defaults.js'

jest.mock('./core/OLDrawManager.js', () => ({
  OLDrawManager: jest.fn(function () {
    this.setMapStyle = jest.fn()
    this.remove = jest.fn()
  })
}))

const events = { MAP_SET_SIZE: 'app:size', MAP_SET_STYLE: 'app:style' }

const setup = (mapStyle = null) => {
  const listeners = {}
  const eventBus = {
    on: jest.fn((type, handler) => { listeners[type] = handler }),
    off: jest.fn(),
    emit: (type, payload) => listeners[type]?.(payload)
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

test('map size changes update the draw UI scale, defaulting to 1 for unknown sizes', () => {
  const { eventBus, mapProvider } = setup()
  eventBus.emit(events.MAP_SET_SIZE, 'large')
  expect(mapProvider.drawScale).toBe(MAP_SIZE_SCALES.large)
  eventBus.emit(events.MAP_SET_SIZE, 'enormous')
  expect(mapProvider.drawScale).toBe(1)
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

test('map style changes are forwarded to the manager', () => {
  const { eventBus, manager } = setup()
  eventBus.emit(events.MAP_SET_STYLE, { id: 'dark' })
  expect(manager.setMapStyle).toHaveBeenCalledWith({ id: 'dark' })
})

test('remove unsubscribes, destroys the manager and clears mapProvider.draw', () => {
  const { eventBus, mapProvider, olDraw, manager } = setup()
  olDraw.remove()
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_SIZE, expect.any(Function))
  expect(eventBus.off).toHaveBeenCalledWith(events.MAP_SET_STYLE, expect.any(Function))
  expect(manager.remove).toHaveBeenCalled()
  expect(mapProvider.draw).toBeNull()
})
