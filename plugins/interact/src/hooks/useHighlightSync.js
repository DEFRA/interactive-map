import { useEffect, useMemo } from 'react'
import { buildStylesMap } from '../utils/buildStylesMap.js'

// How long after a map style/size change to keep re-applying highlights on every
// MAP_DATA_CHANGE — see the effect's own comment.
const SETTLE_WINDOW_MS = 3000

/**
 * Keeps map highlight rendering in sync with the current selection and keyboard-active item.
 *
 * Calls mapProvider.updateHighlightedFeatures whenever selectedFeatures or listboxActiveItem
 * changes, passing selected features (shown with the selection ring) and the active item
 * (shown with the keyboard cursor ring) as separate arguments so the provider can style them
 * differently. Also re-applies highlights after a map style reload or a map-size change,
 * since both remove/rebuild highlight layers and/or leave a selected feature's own drawn
 * symbol (colours, resolution) briefly stale until the draw plugin re-resolves it.
 */
export const useHighlightSync = ({
  mapProvider,
  mapStyle,
  pluginState,
  selectedFeatures,
  events,
  eventBus
}) => {
  const { layers, listboxActiveItem } = pluginState

  // Memoize stylesMap so it only recalculates when style or layers change
  const stylesMap = useMemo(() => {
    if (!mapStyle) {
      return null
    }
    return buildStylesMap(layers, mapStyle)
  }, [layers, mapStyle])

  // Force re-application of all selected features
  const updateHighlightedFeatures = () => {
    const activeFeatures = listboxActiveItem
      ? [{ featureId: listboxActiveItem.featureId, layerId: listboxActiveItem.layerId, idProperty: listboxActiveItem.idProperty, geometry: listboxActiveItem.geometry }]
      : []
    mapProvider.updateHighlightedFeatures?.(selectedFeatures, activeFeatures, stylesMap)
  }

  useEffect(() => {
    if (!mapProvider || !stylesMap) {
      return undefined // Explicit return to match the cleanup function return below
    }

    updateHighlightedFeatures()

    // MAP_STYLE_CHANGE/MAP_SET_SIZE fire before layers are re-added or symbols re-resolved, so
    // this arms a "keep re-applying" window rather than reacting once — MAP_DATA_CHANGE can
    // fire more than once as things settle, and a single listen-once would miss the later,
    // real update. A permanent listener isn't safe either, since updateHighlightedFeatures()
    // itself can trigger further MAP_DATA_CHANGE events. Uses `on`/`off`, not `once` — its
    // returned wrapper can't be off()'d by this same handler reference.
    let settleUntil = 0
    let armed = false
    const reapply = () => {
      updateHighlightedFeatures()
      if (Date.now() >= settleUntil) {
        eventBus.off(events.MAP_DATA_CHANGE, reapply)
        armed = false
      }
    }
    const armSettleWindow = () => {
      settleUntil = Date.now() + SETTLE_WINDOW_MS
      if (!armed) {
        armed = true
        eventBus.on(events.MAP_DATA_CHANGE, reapply)
      }
    }
    eventBus.on(events.MAP_STYLE_CHANGE, armSettleWindow)
    eventBus.on(events.MAP_SET_SIZE, armSettleWindow)

    return () => {
      eventBus.off(events.MAP_STYLE_CHANGE, armSettleWindow)
      eventBus.off(events.MAP_SET_SIZE, armSettleWindow)
      eventBus.off(events.MAP_DATA_CHANGE, reapply)
    }
  }, [selectedFeatures, listboxActiveItem, mapProvider, stylesMap, eventBus])
}
