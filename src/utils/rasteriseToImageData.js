const SVG_ERROR_PREVIEW_LENGTH = 80

/**
 * Rasterises an SVG string to an ImageData object via a canvas.
 *
 * @param {string} svgString - Full SVG markup to render
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @returns {Promise<ImageData>}
 */
export const rasteriseToImageData = (svgString, width, height) =>
  new Promise((resolve, reject) => {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
    const img = new Image(width, height)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(ctx.getImageData(0, 0, width, height))
    }
    img.onerror = () => {
      reject(new Error(`Failed to rasterise SVG: ${svgString.slice(0, SVG_ERROR_PREVIEW_LENGTH)}`))
    }
    img.src = url
  })
