export const cleanDOM = (container) => {
  if (!container) {
    return
  }
  const canvasContainer = container.querySelector('.esri-view-surface')
  canvasContainer.removeAttribute('role')
  canvasContainer.tabIndex = -1
  canvasContainer.style['outline-color'] = 'transparent'
  canvasContainer.style.touchAction = 'none'
}