import { useEffect } from 'react'

// 'draw' is a logical wildcard (every draw-owned layer collapsed to one config entry), not a
// real map layer on providers — like MapLibre — that give each feature its own layer, so it
// can't be filtered on directly. Adapters that need real layer ids expose
// getCommittedFeatureLayerIds() to resolve it; adapters with one real 'draw' layer (OpenLayers)
// have no such method, so the literal id passes through unchanged.
const resolveLayerId = (mapProvider, layerId) => {
  if (layerId !== 'draw') {
    return [layerId]
  }
  return mapProvider.draw?.getCommittedFeatureLayerIds?.() ?? [layerId]
}

export const useHoverCursor = (mapProvider, enabled, interactionModes, layers) => {
  useEffect(() => {
    const canSelect = enabled && interactionModes?.includes('selectFeature')
    const layerIds = canSelect ? layers.flatMap(l => resolveLayerId(mapProvider, l.layerId)) : []
    mapProvider.setHoverCursor?.(layerIds)
    return () => mapProvider.setHoverCursor?.([])
  }, [enabled, interactionModes, layers, mapProvider])
}
