export const getWebGL = (names) => {
  if (!window.WebGLRenderingContext) {
    // WebGL is not supported
    return {
      isEnabled: false, error: 'WebGL is not supported'
    }
  }
  const canvas = document.createElement('canvas')
  let context = false
  for (const name of names) {
    try {
      context = canvas.getContext(name)
      if (context && typeof context.getParameter === 'function') {
        // WebGL is enabled
        return {
          isEnabled: true
        }
      }
    } catch (e) {
      // No action required
    }
  }
  // WebGL is supported, but disabled
  return {
    isEnabled: false, error: 'WebGL is supported, but disabled'
  }
}
