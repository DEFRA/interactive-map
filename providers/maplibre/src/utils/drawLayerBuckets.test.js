import { siblingDrawLayerId } from './drawLayerBuckets.js'

test('returns the .hot sibling for a .cold layer id', () => {
  expect(siblingDrawLayerId('point-symbol.cold')).toBe('point-symbol.hot')
})

test('returns the .cold sibling for a .hot layer id', () => {
  expect(siblingDrawLayerId('point-symbol.hot')).toBe('point-symbol.cold')
})

test('returns null for a layer id with no cold/hot suffix', () => {
  expect(siblingDrawLayerId('field-parcels')).toBeNull()
})

test('does not false-positive on a layer id that merely contains "cold" or "hot" mid-string', () => {
  expect(siblingDrawLayerId('coldstore-layer')).toBeNull()
  expect(siblingDrawLayerId('hotfix-layer')).toBeNull()
})
