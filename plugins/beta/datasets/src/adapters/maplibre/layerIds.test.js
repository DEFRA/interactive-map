import {
  hashString,
  MAX_TILE_ZOOM
} from './layerIds'

import { hasPattern } from '../../../../../../src/utils/patternUtils.js'

jest.mock('../../../../../../src/utils/patternUtils.js', () => ({
  hasPattern: jest.fn(() => false)
}))

beforeEach(() => {
  hasPattern.mockReturnValue(false)
})

// ─── MAX_TILE_ZOOM ────────────────────────────────────────────────────────────

describe('MAX_TILE_ZOOM', () => {
  it('is 22', () => {
    expect(MAX_TILE_ZOOM).toBe(22)
  })
})

// ─── hashString ───────────────────────────────────────────────────────────────

describe('hashString', () => {
  it('returns a non-empty string', () => {
    expect(hashString('hello')).toMatch(/^[a-z0-9]+$/)
  })

  it('returns the same hash for the same input', () => {
    expect(hashString('https://tiles.example.com/{z}/{x}/{y}')).toBe(
      hashString('https://tiles.example.com/{z}/{x}/{y}')
    )
  })

  it('returns different hashes for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'))
  })

  it('handles an empty string without throwing', () => {
    expect(() => hashString('')).not.toThrow()
  })
})
