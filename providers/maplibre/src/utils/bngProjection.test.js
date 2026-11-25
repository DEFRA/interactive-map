// The module registers once per page, so each test loads a fresh copy
const loadModule = () => {
  let module
  jest.isolateModules(() => { module = require('./bngProjection.js') })
  return module
}

const createMaplibre = () => ({ addProjection: jest.fn(), importScriptInWorkers: jest.fn(() => Promise.resolve()) })

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve('/* proj4 */') }))
  global.URL.createObjectURL = jest.fn(() => 'blob:worker-script')
})

test('registers British National Grid on the OS tile grid, in MapLibre and its workers', async () => {
  const { registerBngProjection, BNG_CRS } = loadModule()
  const maplibre = createMaplibre()

  const projection = await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledWith(expect.objectContaining({
    name: BNG_CRS,
    tileMatrixSet: { origin: [-238375, 1376256], extentAtZoom0: 1835008 }
  }))
  expect(maplibre.importScriptInWorkers).toHaveBeenCalledWith('blob:worker-script')
  // The grid's true origin is 49°N 2°W, at 400000 E, -100000 N (before the datum shift)
  const [easting, northing] = projection.forward([-2, 49])
  expect(easting).toBeCloseTo(400000, -3)
  expect(northing).toBeCloseTo(-100000, -3)
})

test('registers only once, however many maps use it', async () => {
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()

  await registerBngProjection(maplibre)
  await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledTimes(1)
})

test('can be tried again after a failed registration', async () => {
  const { registerBngProjection } = loadModule()
  const maplibre = createMaplibre()
  maplibre.importScriptInWorkers.mockRejectedValueOnce(new Error('worker failed'))

  await expect(registerBngProjection(maplibre)).rejects.toThrow('worker failed')
  await registerBngProjection(maplibre)

  expect(maplibre.addProjection).toHaveBeenCalledTimes(2)
})
