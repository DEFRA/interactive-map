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
    } catch (_) { // NOSONAR - getContext may throw; failure is handled by the loop fallthrough
    }
  }
  // WebGL is supported, but disabled
  return {
    isEnabled: false, error: 'WebGL is supported, but disabled'
  }
}
