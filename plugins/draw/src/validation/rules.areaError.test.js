import { nonZeroArea } from './rules.js'

// A separate file is required: this file-level @turf/area mock is hoisted above the
// import and applies to the whole file, so it can't live in rules.test.js without
// breaking the tests there that rely on the real area calculation. It covers the
// defensive catch in nonZeroArea (a turf failure is treated as "skip / valid").
jest.mock('@turf/area', () => ({ __esModule: true, default: jest.fn(() => { throw new Error('turf boom') }) }))

test('nonZeroArea treats a turf area failure as a skip (valid)', () => {
  const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1]]] } }
  expect(nonZeroArea(feature)).toEqual({ valid: true })
})
