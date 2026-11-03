import { getBoxCenter, isInside, isOverlapping } from './screenBox.js'

const MAX_PADDING_PERCENT = 25
// Turns a percentage into a fraction
const PERCENT_DIVISOR = 100

const SIDES = ['top', 'right', 'bottom', 'left']

const clampPercent = (value) => Math.min(Math.max(Number(value) || 0, 0), MAX_PADDING_PERCENT)

/**
 * Normalise `paddingPercent` into a percentage for each side, limited to 0–25.
 *
 * @param {number|{ top?: number, right?: number, bottom?: number, left?: number }} [paddingPercent]
 * @returns {{ top: number, right: number, bottom: number, left: number }}
 */
export const normalisePaddingPercent = (paddingPercent) => {
  const isPerSide = paddingPercent !== null && typeof paddingPercent === 'object'
  return Object.fromEntries(SIDES.map(side => [side, clampPercent(isPerSide ? paddingPercent[side] : paddingPercent)]))
}

/**
 * How `fitToBounds` should move the map to show a box. Every value is in the same pixels as
 * `box` and `safeZone`.
 *
 * Without `preferPan`, the box is always fitted. With it, a box already inside the safe zone and
 * clear of every panel doesn't move, a box that fits inside the safe zone less its margin is
 * centred there, and any other box is fitted. Panels are checked separately because the safe zone
 * leaves out a panel too small to narrow it.
 *
 * @param {object} params
 * @param {{ left: number, top: number, right: number, bottom: number }} [params.box] - The geometry's on-screen box. Needed with `preferPan`.
 * @param {{ left: number, top: number, right: number, bottom: number }} params.safeZone - The safe zone's edges.
 * @param {Array<{ left: number, top: number, right: number, bottom: number }>} [params.panels] - Open panels over the map.
 * @param {boolean} [params.preferPan]
 * @param {number|object} [params.paddingPercent] - Space kept clear inside the safe zone, as a percentage of its size.
 * @returns {{ type: 'none' } | { type: 'pan', offset: [number, number] } | { type: 'fit', margin: { top: number, right: number, bottom: number, left: number } }}
 */
export const getFitMove = ({ box, safeZone, panels = [], preferPan = false, paddingPercent }) => {
  const percent = normalisePaddingPercent(paddingPercent)
  const width = safeZone.right - safeZone.left
  const height = safeZone.bottom - safeZone.top
  const margin = {
    top: height * percent.top / PERCENT_DIVISOR,
    right: width * percent.right / PERCENT_DIVISOR,
    bottom: height * percent.bottom / PERCENT_DIVISOR,
    left: width * percent.left / PERCENT_DIVISOR
  }

  if (!preferPan) {
    return { type: 'fit', margin }
  }

  if (isInside(box, safeZone) && !panels.some(panel => isOverlapping(box, panel))) {
    return { type: 'none' }
  }

  const inner = {
    left: safeZone.left + margin.left,
    top: safeZone.top + margin.top,
    right: safeZone.right - margin.right,
    bottom: safeZone.bottom - margin.bottom
  }
  const isFitting = box.right - box.left <= inner.right - inner.left && box.bottom - box.top <= inner.bottom - inner.top

  if (!isFitting) {
    return { type: 'fit', margin }
  }

  const [boxX, boxY] = getBoxCenter(box)
  const [innerX, innerY] = getBoxCenter(inner)
  return { type: 'pan', offset: [boxX - innerX, boxY - innerY] }
}
