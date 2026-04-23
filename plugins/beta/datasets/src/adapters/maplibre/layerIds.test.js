import {
  isDynamicSource,
  hashString,
  getSourceId,
  getLayerIds,
  getSublayerLayerIds,
  getAllLayerIds,
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

// ─── isDynamicSource ──────────────────────────────────────────────────────────

describe('isDynamicSource', () => {
  it('returns true when geojson is a string, idProperty is set, and transformRequest is a function', () => {
    expect(isDynamicSource({
      geojson: 'https://api.example.com/data',
      idProperty: 'id',
      transformRequest: () => {}
    })).toBe(true)
  })

  it('returns false when geojson is an object', () => {
    expect(isDynamicSource({
      geojson: { type: 'FeatureCollection', features: [] },
      idProperty: 'id',
      transformRequest: () => {}
    })).toBe(false)
  })

  it('returns false when idProperty is missing', () => {
    expect(isDynamicSource({
      geojson: 'https://api.example.com/data',
      transformRequest: () => {}
    })).toBe(false)
  })

  it('returns false when transformRequest is not a function', () => {
    expect(isDynamicSource({
      geojson: 'https://api.example.com/data',
      idProperty: 'id',
      transformRequest: 'not-a-function'
    })).toBe(false)
  })

  it('returns false when geojson is absent', () => {
    expect(isDynamicSource({ idProperty: 'id', transformRequest: () => {} })).toBe(false)
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

// ─── getSourceId ──────────────────────────────────────────────────────────────

describe('getSourceId', () => {
  it('returns a tiles-prefixed id for a tiles array', () => {
    const dataset = { tiles: ['https://tiles.example.com/{z}/{x}/{y}'] }
    expect(getSourceId(dataset)).toMatch(/^tiles-/)
  })

  it('returns the same id for the same tiles URL', () => {
    const dataset = { tiles: ['https://tiles.example.com/{z}/{x}/{y}'] }
    expect(getSourceId(dataset)).toBe(getSourceId(dataset))
  })

  it('returns different ids for different tile URLs', () => {
    const a = { tiles: ['https://a.example.com/{z}/{x}/{y}'] }
    const b = { tiles: ['https://b.example.com/{z}/{x}/{y}'] }
    expect(getSourceId(a)).not.toBe(getSourceId(b))
  })

  it('joins multiple tile URLs when building the hash key', () => {
    const multi = { tiles: ['https://a.example.com', 'https://b.example.com'] }
    const single = { tiles: 'https://a.example.com,https://b.example.com' }
    expect(getSourceId(multi)).toBe(getSourceId(single))
  })

  it('returns a tiles-prefixed id when tiles is a plain string', () => {
    const dataset = { tiles: 'https://tiles.example.com/{z}/{x}/{y}' }
    expect(getSourceId(dataset)).toMatch(/^tiles-/)
  })

  it('returns geojson-dynamic-<id> for a dynamic geojson source', () => {
    const dataset = {
      id: 'my-dataset',
      geojson: 'https://api.example.com/data',
      idProperty: 'id',
      transformRequest: () => {}
    }
    expect(getSourceId(dataset)).toBe('geojson-dynamic-my-dataset')
  })

  it('returns a geojson-prefixed hash for a static geojson URL string', () => {
    const dataset = { id: 'my-dataset', geojson: 'https://api.example.com/static.geojson' }
    expect(getSourceId(dataset)).toMatch(/^geojson-/)
    expect(getSourceId(dataset)).not.toBe('geojson-my-dataset')
  })

  it('returns geojson-<id> for a geojson object', () => {
    const dataset = { id: 'my-dataset', geojson: { type: 'FeatureCollection', features: [] } }
    expect(getSourceId(dataset)).toBe('geojson-my-dataset')
  })

  it('returns source-<id> when dataset has neither tiles nor geojson', () => {
    expect(getSourceId({ id: 'my-dataset' })).toBe('source-my-dataset')
  })
})

// ─── getLayerIds ──────────────────────────────────────────────────────────────

describe('getLayerIds', () => {
  it('returns symbolLayerId = dataset.id and nulls for fill/stroke when dataset has a symbol', () => {
    const result = getLayerIds({ id: 'ds', symbol: 'marker' })
    expect(result).toEqual({ fillLayerId: null, strokeLayerId: null, symbolLayerId: 'ds' })
  })

  it('returns fillLayerId = dataset.id when dataset has a fill', () => {
    const result = getLayerIds({ id: 'ds', fill: 'blue' })
    expect(result.fillLayerId).toBe('ds')
  })

  it('returns fillLayerId = null when fill is transparent', () => {
    const result = getLayerIds({ id: 'ds', fill: 'transparent' })
    expect(result.fillLayerId).toBeNull()
  })

  it('returns fillLayerId = null when fill is absent', () => {
    const result = getLayerIds({ id: 'ds', stroke: 'red' })
    expect(result.fillLayerId).toBeNull()
  })

  it('returns fillLayerId = dataset.id when dataset has a pattern', () => {
    hasPattern.mockReturnValue(true)
    const result = getLayerIds({ id: 'ds', fillPattern: 'dots' })
    expect(result.fillLayerId).toBe('ds')
  })

  it('returns strokeLayerId = <id>-stroke when both fill and stroke are present', () => {
    const result = getLayerIds({ id: 'ds', fill: 'blue', stroke: 'red' })
    expect(result.strokeLayerId).toBe('ds-stroke')
  })

  it('returns strokeLayerId = dataset.id when only stroke is present (no fill)', () => {
    const result = getLayerIds({ id: 'ds', stroke: 'red' })
    expect(result.strokeLayerId).toBe('ds')
  })

  it('returns strokeLayerId = null when stroke is absent', () => {
    const result = getLayerIds({ id: 'ds', fill: 'blue' })
    expect(result.strokeLayerId).toBeNull()
  })

  it('returns all nulls when neither fill, stroke, pattern nor symbol are set', () => {
    const result = getLayerIds({ id: 'ds' })
    expect(result).toEqual({ fillLayerId: null, strokeLayerId: null, symbolLayerId: null })
  })
})

// ─── getSublayerLayerIds ──────────────────────────────────────────────────────

describe('getSublayerLayerIds', () => {
  it('returns correctly formatted ids for a given datasetId and sublayerId', () => {
    expect(getSublayerLayerIds('ds', 'sl')).toEqual({
      fillLayerId: 'ds-sl',
      strokeLayerId: 'ds-sl-stroke',
      symbolLayerId: 'ds-sl-symbol'
    })
  })
})

// ─── getAllLayerIds ───────────────────────────────────────────────────────────

describe('getAllLayerIds', () => {
  it('returns all sublayer layer ids when sublayers are present', () => {
    const dataset = {
      id: 'ds',
      sublayers: [
        { id: 'sl1' },
        { id: 'sl2' }
      ]
    }
    const ids = getAllLayerIds(dataset)
    expect(ids).toEqual([
      'ds-sl1-stroke', 'ds-sl1', 'ds-sl1-symbol',
      'ds-sl2-stroke', 'ds-sl2', 'ds-sl2-symbol'
    ])
  })

  it('returns fill and stroke ids for a dataset with fill and stroke', () => {
    const dataset = { id: 'ds', fill: 'blue', stroke: 'red' }
    const ids = getAllLayerIds(dataset)
    expect(ids).toContain('ds')
    expect(ids).toContain('ds-stroke')
  })

  it('returns only the symbol id for a symbol dataset', () => {
    const dataset = { id: 'ds', symbol: 'marker' }
    const ids = getAllLayerIds(dataset)
    expect(ids).toEqual(['ds'])
  })

  it('filters out null ids when dataset has neither fill, stroke, nor symbol', () => {
    const dataset = { id: 'ds' }
    const ids = getAllLayerIds(dataset)
    expect(ids).toEqual([])
  })

  it('handles an empty sublayers array by falling through to direct layer ids', () => {
    const dataset = { id: 'ds', sublayers: [], fill: 'blue' }
    const ids = getAllLayerIds(dataset)
    expect(ids).toContain('ds')
  })
})
