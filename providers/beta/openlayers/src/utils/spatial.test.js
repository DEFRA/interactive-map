import {
  formatDimension,
  getAreaDimensions,
  getCardinalMove,
  getExtentFromGeoJSON,
  getPaddedExtent,
  isGeometryObscured
} from './spatial.js'

jest.mock('ol/proj.js', () => ({
  __esModule: true,
  transform: (coord) => coord,
  transformExtent: (extent) => extent
}))

describe('formatDimension', () => {
  it('formats sub-mile distances in meters', () => {
    expect(formatDimension(400)).toBe('400m')
  })

  it('formats exactly 1 mile', () => {
    expect(formatDimension(1609.344)).toBe('1 mile')
  })

  it('formats decimal miles with plural', () => {
    expect(formatDimension(2414.016)).toBe('1.5 miles')
  })

  it('formats 10+ miles as whole number', () => {
    expect(formatDimension(20000)).toBe('12 miles')
  })
})

describe('getAreaDimensions', () => {
  it('returns empty string for null extent', () => {
    expect(getAreaDimensions(null)).toBe('')
  })

  it('returns height by width as formatted strings', () => {
    // 1609m height (~1 mile), 804m width (sub-mile)
    expect(getAreaDimensions([0, 0, 804, 1609])).toBe('1 mile by 804m')
  })
})

describe('getCardinalMove', () => {
  it('returns empty string for sub-threshold move', () => {
    expect(getCardinalMove([0, 0], [0.5, 0.5])).toBe('')
  })

  it('describes north and east movement', () => {
    expect(getCardinalMove([0, 0], [100, 100])).toBe('north 100m, east 100m')
  })

  it('describes south and west movement', () => {
    expect(getCardinalMove([100, 100], [0, 0])).toBe('south 100m, west 100m')
  })

  it('describes single-axis movement', () => {
    expect(getCardinalMove([0, 0], [0, 100])).toBe('north 100m')
  })
})

describe('getExtentFromGeoJSON', () => {
  it('returns a 4-element extent from a GeoJSON point', () => {
    const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 51] } }
    expect(getExtentFromGeoJSON(point)).toEqual([0, 51, 0, 51])
  })
})

describe('getPaddedExtent', () => {
  const makeMap = (padding) => ({
    getSize: () => [800, 600],
    getView: () => ({ padding }),
    getCoordinateFromPixel: (pixel) => pixel
  })

  it('applies padding to sw and ne corner pixels', () => {
    // padding [top=10, right=20, bottom=30, left=40]
    // sw pixel: [left=40, height-bottom=570] → ne pixel: [width-right=780, top=10]
    expect(getPaddedExtent(makeMap([10, 20, 30, 40]))).toEqual([40, 570, 780, 10])
  })

  it('uses zero padding when view.padding is null', () => {
    expect(getPaddedExtent(makeMap(null))).toEqual([0, 600, 800, 0])
  })

  it('returns null when coordinate projection fails', () => {
    const map = {
      getSize: () => [800, 600],
      getView: () => ({ padding: null }),
      getCoordinateFromPixel: () => null
    }
    expect(getPaddedExtent(map)).toBeNull()
  })
})

describe('isGeometryObscured', () => {
  const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [-1, 51] } }
  const panel = { left: 0, top: 0, right: 100, bottom: 100 }

  const makeMap = (pixelFn) => ({
    getTargetElement: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
    getPixelFromCoordinate: pixelFn
  })

  it('returns false when no corners project to screen pixels', () => {
    expect(isGeometryObscured(point, panel, makeMap(() => null))).toBe(false)
  })

  it('returns true when geometry overlaps panel', () => {
    expect(isGeometryObscured(point, panel, makeMap(() => [50, 50]))).toBe(true)
  })

  it('returns false when geometry is outside panel', () => {
    expect(isGeometryObscured(point, panel, makeMap(() => [200, 200]))).toBe(false)
  })
})
