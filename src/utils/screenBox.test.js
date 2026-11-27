import { getScreenBox, getRelativeBox, getBoxCenter, isInside, isOverlapping } from './screenBox.js'

describe('getScreenBox', () => {
  // Projects [x, y] to { x, y } with y flipped, as screens count down from the top
  const mapToScreen = ([x, y]) => ({ x, y: -y })

  test('bounds the projected corners of a flat bounds array', () => {
    expect(getScreenBox([10, 20, 30, 40], mapToScreen)).toEqual({ left: 10, top: -40, right: 30, bottom: -20 })
  })

  test('accepts nested [[west, south], [east, north]] bounds', () => {
    expect(getScreenBox([[10, 20], [30, 40]], mapToScreen)).toEqual({ left: 10, top: -40, right: 30, bottom: -20 })
  })

  test('works out the bounds of GeoJSON', () => {
    const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[10, 40], [30, 20]] }, properties: {} }
    expect(getScreenBox(feature, mapToScreen)).toEqual({ left: 10, top: -40, right: 30, bottom: -20 })
  })

  test('ignores heights in 3D GeoJSON', () => {
    const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[10, 40, 5], [30, 20, 9]] }, properties: {} }
    expect(getScreenBox(feature, mapToScreen)).toEqual({ left: 10, top: -40, right: 30, bottom: -20 })
  })

  test('gives a point a box with no size', () => {
    expect(getScreenBox({ type: 'Point', coordinates: [10, 20] }, mapToScreen)).toEqual({ left: 10, top: -20, right: 10, bottom: -20 })
  })

  test('multiplies the projected pixels by the scale', () => {
    expect(getScreenBox([10, 20, 30, 40], mapToScreen, 2)).toEqual({ left: 20, top: -80, right: 60, bottom: -40 })
  })
})

describe('getRelativeBox', () => {
  test('makes a rect relative to another', () => {
    expect(getRelativeBox({ left: 110, top: 70, right: 210, bottom: 170 }, { left: 10, top: 20 })).toEqual({ left: 100, top: 50, right: 200, bottom: 150 })
  })
})

describe('getBoxCenter', () => {
  test('gives the middle of a box', () => {
    expect(getBoxCenter({ left: 100, top: 50, right: 300, bottom: 150 })).toEqual([200, 100])
  })
})

describe('isInside', () => {
  const area = { left: 100, top: 50, right: 300, bottom: 150 }

  test('is true for a box within the area, including one touching its edges', () => {
    expect(isInside({ left: 150, top: 60, right: 250, bottom: 100 }, area)).toBe(true)
    expect(isInside(area, area)).toBe(true)
  })

  test('is false for a box that crosses an edge', () => {
    expect(isInside({ left: 250, top: 60, right: 350, bottom: 100 }, area)).toBe(false)
  })
})

describe('isOverlapping', () => {
  const area = { left: 100, top: 50, right: 300, bottom: 120 }

  test('is true for boxes that overlap', () => {
    expect(isOverlapping({ left: 250, top: 100, right: 350, bottom: 200 }, area)).toBe(true)
  })

  test('is false for boxes that only touch at an edge', () => {
    expect(isOverlapping({ left: 300, top: 60, right: 350, bottom: 100 }, area)).toBe(false)
  })
})
