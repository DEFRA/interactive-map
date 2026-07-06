import { scalePoint, isOnSVG } from './helpers.js'

describe('helpers', () => {
  test('scalePoint multiplies both axes by the scale', () => {
    expect(scalePoint({ x: 2, y: 3 }, 4)).toEqual({ x: 8, y: 12 })
    expect(scalePoint({ x: 5, y: 5 }, 1)).toEqual({ x: 5, y: 5 })
  })

  test('isOnSVG detects SVG elements and their descendants, not plain DOM nodes', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    svg.appendChild(circle)
    expect(isOnSVG(svg)).toBeTruthy() // instanceof SVGElement
    expect(isOnSVG(circle)).toBeTruthy() // nested SVG element
    expect(isOnSVG(document.createElement('div'))).toBeFalsy()
  })
})
