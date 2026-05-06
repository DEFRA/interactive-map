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
    // MAP_STYLE_CHANGE fires as soon as the new style is ready, before any plugin has
    // re-added its layers, so we register a one-time MAP_DATA_CHANGE listener instead.
    // MAP_DATA_CHANGE is debounced and fires once all layer additions from every plugin
    // have settled, giving us a single well-timed trigger. Using once() avoids the
    // infinite loop a permanent listener would cause (layer moves re-trigger MAP_DATA_CHANGE).
    const handleStyleChange = () => {
      eventBus.once(events.MAP_DATA_CHANGE, updateHighlightedFeatures)
    }
    eventBus.on(events.MAP_STYLE_CHANGE, handleStyleChange)

    return () => {
      eventBus.off(events.MAP_STYLE_CHANGE, handleStyleChange)
    }
  }, [selectedFeatures, listboxActiveItem, mapProvider, stylesMap, eventBus])
}
