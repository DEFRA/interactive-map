/**
 * SVG offset vertex target — shown below the finger in touch edit mode
 * so the user can accurately reposition a vertex without finger occlusion.
 * This module handles DOM management only; drag logic lives in touchHandler.js.
 *
 * The SVG uses CSS custom properties so colors update when the map style changes:
 *   --draw-halo      outer ring (black on light, white on dark)
 *   --draw-bg        inner background (white on light, near-black on dark)
 *   --draw-primary   arrow icons and centre dot (blue on light, white on dark)
 */

const SVG_HTML = `
  <svg width='48' height='48' viewBox='0 0 48 48' fill-rule='evenodd'
    style='display:none;position:absolute;top:0;left:0;margin:24px 0 0 -24px;cursor:grab'
    class='im-draw-touch-target' data-im-draw-touch-target>
    <circle cx='24' cy='24' r='24' fill='var(--draw-halo, #000)'/>
    <path d="M37.543 25H34a1 1 0 1 1 0-2h3.629l-.836-.837a1 1 0 0 1 1.414-1.414l2.5 2.501A1 1 0 0 1 41 24a1 1 0 0 1-.487.858l-2.306 2.306a1 1 0 0 1-1.414-1.414l.75-.75zM23 10.414l-.793.793a1 1 0 0 1-1.414-1.414l2.5-2.5C23.481 7.105 23.734 7 24 7s.519.105.707.293l2.5 2.5a1 1 0 0 1-1.414 1.414L25 10.414V14a1 1 0 1 1-2 0v-3.586zM7 24a1 1 0 0 1 .293-.75l2.5-2.501a1 1 0 0 1 1.414 1.414l-.836.837H14a1 1 0 1 1 0 2h-3.543l.75.75a1 1 0 0 1-1.414 1.414l-2.306-2.306A1 1 0 0 1 7 24zm16.293 16.707l-2.5-2.5a1 1 0 0 1 1.414-1.414l.793.793V34a1 1 0 1 1 2 0v3.586l.793-.793a1 1 0 0 1 1.414 1.414l-2.5 2.5c-.188.188-.441.293-.707.293s-.519-.105-.707-.293zM24 20c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4z" fill='var(--draw-bg, #fff)'/>
  </svg>
`

export const createTouchTarget = (container) => {
  let el = container.querySelector('[data-im-draw-touch-target]')
  if (!el) {
    container.insertAdjacentHTML('beforeend', SVG_HTML)
    el = container.querySelector('[data-im-draw-touch-target]')
  }
  return el
}

export const applyTouchTargetColors = (el, colors) => {
  if (!el) {
    return
  }
  el.style.setProperty('--draw-halo', colors.halo)
  el.style.setProperty('--draw-bg', colors.background)
  el.style.setProperty('--draw-primary', colors.primary)
}

export const showTouchTarget = (el, pixel) => {
  if (!pixel || !el) {
    return
  }
  el.style.left = `${pixel.x}px`
  el.style.top = `${pixel.y}px`
  el.style.display = 'block'
}

export const hideTouchTarget = (el) => {
  if (el) {
    el.style.display = 'none'
  }
}

/** True when the event target is part of the SVG touch target element. */
export const isOnTouchTarget = (el) => {
  if (!el) {
    return false
  }
  const parent = el.parentNode
  return (parent instanceof globalThis.SVGElement) || (parent?.ownerSVGElement != null)
}
