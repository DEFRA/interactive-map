export const scalePoint = (point, scale) => ({ x: point.x * scale, y: point.y * scale })
export const isOnSVG = (el) => el instanceof window.SVGElement || el.ownerSVGElement
