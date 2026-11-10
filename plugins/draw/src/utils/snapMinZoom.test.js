import { isBelowSnapMinZoom, getSnapHintText } from './snapMinZoom.js'

describe('isBelowSnapMinZoom', () => {
  test('is true only below snapMinZoom', () => {
    expect(isBelowSnapMinZoom({ snapMinZoom: 16 }, 15.9)).toBe(true)
    expect(isBelowSnapMinZoom({ snapMinZoom: 16 }, 16)).toBe(false)
  })

  test('is false without a snapMinZoom or a zoom', () => {
    expect(isBelowSnapMinZoom({}, 1)).toBe(false)
    expect(isBelowSnapMinZoom(undefined, 1)).toBe(false)
    expect(isBelowSnapMinZoom({ snapMinZoom: 16 }, undefined)).toBe(false)
  })
})

describe('getSnapHintText', () => {
  test('uses the configured text, or the default', () => {
    expect(getSnapHintText({ snapZoomInHintText: 'Zoom in further' })).toBe('Zoom in further')
    expect(getSnapHintText({})).toBe('Zoom in to use snap')
    expect(getSnapHintText(undefined)).toBe('Zoom in to use snap')
  })
})
