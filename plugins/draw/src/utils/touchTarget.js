/**
 * SVG offset vertex target for touch edit mode
 * Shown below the finger so users can accurately reposition vertices without finger occlusion.
 *
 * Colors update dynamically based on current color scheme via CSS custom properties:
 *   --draw-halo      outer ring (editActive color)
 *   --draw-bg        inner background (editHalo color)
 *   --draw-primary   arrow icons and centre dot (editVertex color)
 */

import { SIZES } from '../defaults.js'

const HALF_SIZE = SIZES.touchTargetSize / 2

/**
 * Generate SVG touch target HTML string based on configured size
 * @returns {string} SVG HTML
 */
function generateSvgHtml () {
  const size = SIZES.touchTargetSize
  const half = HALF_SIZE
  return `
    <svg width='${size}' height='${size}' viewBox='0 0 48 48' fill-rule='evenodd'
      style='display:none;position:absolute;top:0;left:0;margin:${half}px 0 0 -${half}px;cursor:grab'
      class='im-draw-touch-target' data-im-draw-touch-target>
      <circle cx='24' cy='24' r='24' fill='var(--draw-halo, #000)'/>
      <path d="M37.543 25H34a1 1 0 1 1 0-2h3.629l-.836-.837a1 1 0 0 1 1.414-1.414l2.5 2.501A1 1 0 0 1 41 24a1 1 0 0 1-.487.858l-2.306 2.306a1 1 0 0 1-1.414-1.414l.75-.75zM23 10.414l-.793.793a1 1 0 0 1-1.414-1.414l2.5-2.5C23.481 7.105 23.734 7 24 7s.519.105.707.293l2.5 2.5a1 1 0 0 1-1.414 1.414L25 10.414V14a1 1 0 1 1-2 0v-3.586zM7 24a1 1 0 0 1 .293-.75l2.5-2.501a1 1 0 0 1 1.414 1.414l-.836.837H14a1 1 0 1 1 0 2h-3.543l.75.75a1 1 0 0 1-1.414 1.414l-2.306-2.306A1 1 0 0 1 7 24zm16.293 16.707l-2.5-2.5a1 1 0 0 1 1.414-1.414l.793.793V34a1 1 0 1 1 2 0v3.586l.793-.793a1 1 0 0 1 1.414 1.414l-2.5 2.5c-.188.188-.441.293-.707.293s-.519-.105-.707-.293zM24 20c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4z" fill='var(--draw-bg, #fff)'/>
    </svg>
  `
}

/**
 * Create or retrieve the touch target SVG element
 * @param {HTMLElement} container - Parent container element
 * @returns {SVGElement} The touch target element
 */
export const createTouchTarget = (container) => {
  let el = container.querySelector('[data-im-draw-touch-target]')
  if (!el) {
    container.insertAdjacentHTML('beforeend', generateSvgHtml())
    el = container.querySelector('[data-im-draw-touch-target]')
  }
  return el
}

/**
 * Apply color scheme to touch target SVG
 * @param {SVGElement} el - Touch target element
 * @param {object} colors - Color object with editActive, editHalo, editVertex properties
 */
export const applyTouchTargetColors = (el, colors) => {
  if (!el) {
    return
  }
  el.style.setProperty('--draw-halo', colors.editActive)
  el.style.setProperty('--draw-bg', colors.editHalo)
  el.style.setProperty('--draw-primary', colors.editVertex)
}

/**
 * Show touch target at specified pixel position
 * @param {SVGElement} el - Touch target element
 * @param {object} pixel - Position object with x, y properties
 */
export const showTouchTarget = (el, pixel) => {
  if (!pixel || !el) {
    return
  }
  el.style.left = `${pixel.x}px`
  el.style.top = `${pixel.y}px`
  el.style.display = 'block'
}

/**
 * Hide touch target
 * @param {SVGElement} el - Touch target element
 */
export const hideTouchTarget = (el) => {
  if (el) {
    el.style.display = 'none'
  }
}

/**
 * Check if event target is part of the touch target SVG
 * @param {HTMLElement} el - Element to check
 * @returns {boolean} True if element is part of touch target
 */
export const isOnTouchTarget = (el) => {
  if (!el) {
    return false
  }
  const parent = el.parentNode
  return (parent instanceof globalThis.SVGElement) || (parent?.ownerSVGElement != null)
}
