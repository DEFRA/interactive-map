import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({ logger: { error: jest.fn() } }))

// The module registers once per page, so each test loads a fresh copy
const loadModule = () => {
  let module
  jest.isolateModules(() => { module = require('./bngProjection.js') })
  return module
}

const createMaplibre = () => ({ addProjection: jest.fn(), importScriptInWorkers: jest.fn(() => Promise.resolve()) })

test('registers British National Grid on the OS tile grid, in MapLibre and its workers', async () => {
  const { registerBngProjection, BNG_CRS } = loadModule()
  const maplibre = createMaplibre()

  const projection = await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledWith(expect.objectContaining({
    name: BNG_CRS,
    tileMatrixSet: { origin: [-238375, 1376256], extentAtZoom0: 1835008 }
  }))
  expect(maplibre.importScriptInWorkers).toHaveBeenCalledWith(expect.stringMatching(/\/bngTransform\.mjs$/))
  expect(projection.forward([-2, 49])).toEqual([expect.closeTo(400000, -3), expect.closeTo(-100000, -3)])
})

test('registers only once, however many maps use it', async () => {
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()

  await registerBngProjection(maplibre)
  await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledTimes(1)
})

test('explains a missing projection script, and can be tried again', async () => {
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()
  maplibre.importScriptInWorkers.mockRejectedValueOnce(new Error('worker failed'))

  await expect(registerBngProjection(maplibre)).rejects.toThrow('worker failed')
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('crsWorkerUrl'))
  await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledTimes(2)
})

test('marks a worker script emitted as .js, so MapLibre imports it as a module', async () => {
  const RealURL = global.URL
  global.URL = class extends RealURL { constructor () { super('https://example.com/im-maplibre-bng-worker.js') } }
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()

  await registerBngProjection(maplibre)

  expect(maplibre.importScriptInWorkers).toHaveBeenCalledWith('https://example.com/im-maplibre-bng-worker.js#.mjs')
  global.URL = RealURL
})

test('imports the worker script from crsWorkerUrl when it is set', async () => {
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()

  await registerBngProjection(maplibre, '/assets/bngTransform.mjs')

  expect(maplibre.importScriptInWorkers).toHaveBeenCalledWith('/assets/bngTransform.mjs')
})
