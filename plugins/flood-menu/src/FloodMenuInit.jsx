import { useEffect } from 'react'

// Keeps this plugin's feature/busy state in sync with the draw-es and frame
// plugins purely via the global eventBus — the drawMenu control never calls
// those plugins' APIs directly, it only tells the host app to (see
// pluginConfig callbacks in components/DrawMenu.jsx), and the host app's
// calls to those plugins are what triggers these events in turn.
export const FloodMenuInit = ({ pluginState, services }) => {
  const { dispatch } = pluginState
  const { eventBus } = services

  useEffect(() => {
    const setFeature = (feature) => dispatch({ type: 'SET_FEATURE', payload: feature || null })
    const clearBusy = () => dispatch({ type: 'SET_BUSY', payload: false })

    // draw-es emits `{ newFeature }` on done, a bare feature on add, and
    // `{ featureId }` (ignored here) on delete.
    const handleDrawDone = (e) => setFeature(e?.newFeature)
    const handleDrawAdd = (feature) => setFeature(feature)
    const handleDrawDelete = () => setFeature(null)
    // frame emits a bare feature on done.
    const handleFrameDone = (feature) => setFeature(feature)

    eventBus.on('draw:done', handleDrawDone)
    eventBus.on('draw:cancelled', clearBusy)
    eventBus.on('draw:add', handleDrawAdd)
    eventBus.on('draw:delete', handleDrawDelete)
    eventBus.on('frame:done', handleFrameDone)
    eventBus.on('frame:cancel', clearBusy)

    return () => {
      eventBus.off('draw:done', handleDrawDone)
      eventBus.off('draw:cancelled', clearBusy)
      eventBus.off('draw:add', handleDrawAdd)
      eventBus.off('draw:delete', handleDrawDelete)
      eventBus.off('frame:done', handleFrameDone)
      eventBus.off('frame:cancel', clearBusy)
    }
  }, [dispatch, eventBus])
}
