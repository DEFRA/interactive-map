import proj4 from 'proj4'

const BNG = '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'

// Corners and centre of the OS tile grid, and a point in London
const POSITIONS = [[-238375, 1376256], [1597000, 1376256], [-238375, -459000], [1597000, -459000], [680000, 458000], [530000, 180000]]

test('converts the same as proj4, to well under a millimetre', () => {
  const { forward, inverse } = require('./bngTransform.mjs')
  const converter = proj4(BNG)

  POSITIONS.forEach(position => {
    const lngLat = converter.inverse(position)
    const [easting, northing] = converter.forward(lngLat)
    expect(inverse(position)).toEqual([expect.closeTo(lngLat[0], 10), expect.closeTo(lngLat[1], 10)])
    expect(forward(lngLat)).toEqual([expect.closeTo(easting, 4), expect.closeTo(northing, 4)])
  })
})

test('sets the projection handler when loaded in a MapLibre worker', () => {
  globalThis.setProjectionHandler = jest.fn()
  jest.isolateModules(() => require('./bngTransform.mjs'))

  const { forward } = globalThis.setProjectionHandler.mock.calls[0][0]()
  expect(forward([-2, 49])).toEqual([expect.closeTo(400000, -3), expect.closeTo(-100000, -3)])
  delete globalThis.setProjectionHandler
})
