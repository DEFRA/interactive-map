import { getBestScale } from './utils.js'

describe('getBestScale', () => {
  describe('metric units', () => {
    it('returns metres for small distances', () => {
      const result = getBestScale(1, 120, 'metric', 'medium')

      expect(result.label).toBeGreaterThanOrEqual(1)
      expect(result.abbr).toBe('m')
      expect(result.unit).toBe('metres')
      expect(result.width).toBeLessThanOrEqual(120)
    })

    it('returns kilometres for large distances', () => {
      const result = getBestScale(100, 120, 'metric', 'medium')

      expect(result.abbr).toBe('km')
      expect(result.unit).toBe('kilometres')
      expect(result.width).toBeLessThanOrEqual(120)
    })

    it('uses singular unit when label is 1', () => {
      // Find a scale that produces label of 1
      const result = getBestScale(0.0125, 120, 'metric', 'medium')

      expect(result.label).toBe(1)
      expect(result.abbr).toBe('m')
      expect(result.unit).toBe('metre')
    })
  })

  describe('imperial units', () => {
    it('returns miles for large distances', () => {
      const result = getBestScale(100, 120, 'imperial', 'medium')

      expect(result.abbr).toBe('mi')
      expect(result.unit).toBe('miles')
    })

    it('returns yards for medium distances', () => {
      const result = getBestScale(5, 120, 'imperial', 'medium')

      expect(result.abbr).toBe('yds')
      expect(result.unit).toBe('yards')
    })

    it('returns feet for very small distances', () => {
      // Need very small scale to get feet (smallest imperial unit)
      const result = getBestScale(0.01, 120, 'imperial', 'medium')

      expect(result.abbr).toBe('ft')
      expect(result.unit).toBe('feet')
    })
  })

  describe('map size scaling', () => {
    it('adjusts scale based on map size', () => {
      const smallResult = getBestScale(10, 120, 'metric', 'small')
      const mediumResult = getBestScale(10, 120, 'metric', 'medium')
      const largeResult = getBestScale(10, 120, 'metric', 'large')

      // All should produce valid results
      expect(smallResult.width).toBeGreaterThan(0)
      expect(mediumResult.width).toBeGreaterThan(0)
      expect(largeResult.width).toBeGreaterThan(0)

      // At least one should differ (scaling affects the calculation)
      const allSame = smallResult.label === mediumResult.label &&
                      mediumResult.label === largeResult.label &&
                      smallResult.width === mediumResult.width &&
                      mediumResult.width === largeResult.width
      expect(allSame).toBe(false)
    })

    it('handles all map size values', () => {
      const sizes = ['small', 'medium', 'large']

      sizes.forEach(size => {
        const result = getBestScale(10, 120, 'metric', size)
        expect(result).toHaveProperty('label')
        expect(result).toHaveProperty('abbr')
        expect(result).toHaveProperty('width')
        expect(result).toHaveProperty('unit')
      })
    })
  })

  describe('rounding to nice numbers', () => {
    it('returns rounded values like 1, 2, 3, 5, 10, 20, 50, 100', () => {
      const niceNumbers = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500]

      // Test various scales
      const testCases = [0.1, 1, 5, 10, 50, 100]
      testCases.forEach(metersPerPx => {
        const result = getBestScale(metersPerPx, 120, 'metric', 'medium')
        const isNice = niceNumbers.some(n => result.label === n || result.label === n * 10)
        expect(isNice).toBe(true)
      })
    })
  })

  describe('width constraints', () => {
    it('never exceeds maxWidthPx', () => {
      const maxWidth = 100
      const testCases = [0.1, 1, 10, 100, 1000]

      testCases.forEach(metersPerPx => {
        const result = getBestScale(metersPerPx, maxWidth, 'metric', 'medium')
        expect(result.width).toBeLessThanOrEqual(maxWidth)
      })
    })

    it('returns positive width', () => {
      const result = getBestScale(10, 120, 'metric', 'medium')
      expect(result.width).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles very small metersPerPx', () => {
      const result = getBestScale(0.001, 120, 'metric', 'medium')

      expect(result.width).toBeGreaterThan(0)
      expect(result.label).toBeGreaterThan(0)
    })

    it('handles very large metersPerPx', () => {
      const result = getBestScale(10000, 120, 'metric', 'medium')

      expect(result.width).toBeGreaterThan(0)
      expect(result.width).toBeLessThanOrEqual(120)
    })
  })
})
