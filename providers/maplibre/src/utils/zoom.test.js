import { getZoomOffset } from './zoom.js'

const resolutionAt = (mapLibreZoom) => 3584 / 2 ** mapLibreZoom

describe('getZoomOffset', () => {
  it('is 0 in EPSG:4326', () => {
    expect(getZoomOffset('EPSG:4326')).toBe(0)
    expect(getZoomOffset('EPSG:4326', 'world')).toBe(0)
  })

  it('lines up EPSG:27700 zooms with the OS tile grid levels by default', () => {
    const offset = getZoomOffset('EPSG:27700')
    expect(offset).toBe(2)
    // OpenLayers 'uk' zoom 0 is 896 m/px
    expect(resolutionAt(0 + offset)).toBe(896)
  })

  it('lines up EPSG:27700 zooms with the Esri levels for world', () => {
    const offset = getZoomOffset('EPSG:27700', 'world')
    // OpenLayers 'world' (Esri) zoom 7 is 1222.99 m/px
    expect(resolutionAt(7 + offset)).toBeCloseTo(1222.992452562501, 6)
  })

  it('falls back to uk for an unknown alignment', () => {
    expect(getZoomOffset('EPSG:27700', 'galaxy')).toBe(2)
  })
})
