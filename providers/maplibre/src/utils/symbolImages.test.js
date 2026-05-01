import { anchorToMaplibre } from './symbolImages.js'
import { symbolRegistry } from '../../../../src/services/symbolRegistry.js'

beforeEach(() => {
  symbolRegistry.setDefaults({})
})

// ─── anchorToMaplibre ─────────────────────────────────────────────────────────

describe('anchorToMaplibre', () => {
  it('returns center for [0.5, 0.5]', () => {
    expect(anchorToMaplibre([0.5, 0.5])).toBe('center')
  })

  it('returns top for [0.5, 0]', () => {
    expect(anchorToMaplibre([0.5, 0])).toBe('top')
  })

  it('returns bottom for [0.5, 1]', () => {
    expect(anchorToMaplibre([0.5, 1])).toBe('bottom')
  })

  it('returns left for [0, 0.5]', () => {
    expect(anchorToMaplibre([0, 0.5])).toBe('left')
  })

  it('returns right for [1, 0.5]', () => {
    expect(anchorToMaplibre([1, 0.5])).toBe('right')
  })

  it('returns top-left for [0, 0]', () => {
    expect(anchorToMaplibre([0, 0])).toBe('top-left')
  })

  it('returns top-right for [1, 0]', () => {
    expect(anchorToMaplibre([1, 0])).toBe('top-right')
  })

  it('returns bottom-left for [0, 1]', () => {
    expect(anchorToMaplibre([0, 1])).toBe('bottom-left')
  })

  it('returns bottom-right for [1, 1]', () => {
    expect(anchorToMaplibre([1, 1])).toBe('bottom-right')
  })

  it('snaps pin anchor [0.5, 0.9] to bottom', () => {
    expect(anchorToMaplibre([0.5, 0.9])).toBe('bottom') // NOSONAR S109 — deliberate boundary test value
  })

  it('returns center for values in the middle band', () => {
    expect(anchorToMaplibre([0.5, 0.5])).toBe('center')
    expect(anchorToMaplibre([0.26, 0.26])).toBe('center') // NOSONAR S109 — just inside center band
    expect(anchorToMaplibre([0.74, 0.74])).toBe('center') // NOSONAR S109 — just inside center band
  })

  it('returns top at boundary value 0.25', () => {
    expect(anchorToMaplibre([0.5, 0.25])).toBe('top')
  })

  it('returns bottom at boundary value 0.75', () => {
    expect(anchorToMaplibre([0.5, 0.75])).toBe('bottom') // NOSONAR S109 — ANCHOR_HIGH boundary
  })
})
