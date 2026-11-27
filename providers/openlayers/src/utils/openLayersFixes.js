// OL creates hit-detection canvases without willReadFrequently, causing browser warnings.
// Patching getContext ensures any 2D canvas created after this point gets the flag.
export const applyOpenLayersFixes = () => {
  if (typeof HTMLCanvasElement === 'undefined') {
    return
  }
  const _getContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, attrs, ...rest) { // NOSONAR
    return _getContext.call(this, type, type === '2d' ? { ...attrs, willReadFrequently: true } : attrs, ...rest)
  }
}
