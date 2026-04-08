import { useEffect } from 'react'

export const useHoverCursor = (mapProvider, enabled, interactionModes, layers) => {
  useEffect(() => {
    const canSelect = enabled && interactionModes?.includes('selectFeature')
    const layerIds = canSelect ? layers.map(l => l.layerId) : []
    mapProvider.setHoverCursor?.(layerIds)
    return () => mapProvider.setHoverCursor?.([])
  }, [enabled, interactionModes, layers])
}
