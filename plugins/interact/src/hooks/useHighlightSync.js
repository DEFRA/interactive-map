import { useEffect, useMemo } from 'react'
import { buildStylesMap } from '../utils/buildStylesMap.js'

/**
 * Keeps map highlight rendering in sync with the current selection and keyboard-active item.
 *
 * Calls mapProvider.updateHighlightedFeatures whenever selectedFeatures or listboxActiveItem
 * changes, passing selected features (shown with the selection ring) and the active item
 * (shown with the keyboard cursor ring) as separate arguments so the provider can style them
 * differently. Also re-applies highlights after a map style reload, since highlight layers
 * are removed when the base style changes.
 *
 * Dispatches UPDATE_SELECTED_BOUNDS with the bounding box returned by the provider so
 * downstream consumers (e.g. interact:done) receive up-to-date bounds.
 */
export const useHighlightSync = ({
  mapProvider,
  mapStyle,
  pluginState,
  selectedFeatures,
  dispatch,
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
    const bounds = mapProvider.updateHighlightedFeatures?.(selectedFeatures, activeFeatures, stylesMap)

    dispatch({
      type: 'UPDATE_SELECTED_BOUNDS',
      payload: bounds
    })
  }

  useEffect(() => {
    if (!mapProvider || !stylesMap) {
      return undefined // Explicit return to match the cleanup function return below
    }

    updateHighlightedFeatures()

    // Re-apply after style reload — highlight layers are removed when style reloads.
    // MAP_DATA_CHANGE is NOT used here because addLayer/moveLayer fire styledata,
    // which would create an infinite update loop via MAP_DATA_CHANGE.
    eventBus.on(events.MAP_STYLE_CHANGE, updateHighlightedFeatures)

    return () => {
      eventBus.off(events.MAP_STYLE_CHANGE, updateHighlightedFeatures)
    }
  }, [selectedFeatures, listboxActiveItem, mapProvider, stylesMap, eventBus])
}
