import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { buildFilterEvaluator } from './filterEvaluator.js'

const feature = (props) => new Feature({ geometry: new Point([0, 0]), ...props })

describe('buildFilterEvaluator', () => {
  it('returns null for no filter', () => {
    expect(buildFilterEvaluator(undefined)).toBeNull()
  })

  it('matches a feature whose property satisfies the filter', () => {
    const matches = buildFilterEvaluator(['==', ['get', 'category'], 'a'])
    expect(matches(feature({ category: 'a' }))).toBe(true)
  })

  it('rejects a feature whose property does not satisfy the filter', () => {
    const matches = buildFilterEvaluator(['==', ['get', 'category'], 'a'])
    expect(matches(feature({ category: 'b' }))).toBe(false)
  })

  it('evaluates correctly for a feature with no geometry', () => {
    const matches = buildFilterEvaluator(['==', ['get', 'category'], 'a'])
    expect(matches(new Feature({ category: 'a' }))).toBe(true)
  })

  it('reuses one evaluation context across many features without leaking state between them', () => {
    const matches = buildFilterEvaluator(['==', ['get', 'category'], 'a'])
    const results = [
      matches(feature({ category: 'a' })),
      matches(feature({ category: 'b' })),
      matches(feature({ category: 'a' }))
    ]
    expect(results).toEqual([true, false, true])
  })
})
