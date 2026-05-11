import { DIAGONAL_CROSS_HATCH } from './patterns.js'

const PATTERNS = {
  'diagonal-cross-hatch': DIAGONAL_CROSS_HATCH
}

function createCanvasPattern(patternId, foregroundColor) {
  const svgContent = PATTERNS[patternId] ?? null
  if (!svgContent) {
    return Promise.resolve(null)
  }
  const size = 16
  const colored = svgContent.replaceAll('{{foregroundColor}}', foregroundColor)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${colored}</svg>`
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return new Promise(function(resolve) {
    const img = new Image()
    img.onload = function() {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.getContext('2d').createPattern(canvas, 'repeat'))
    }
    img.src = dataUrl
  })
}

export { createCanvasPattern }
