import { useEffect } from 'react'

export const useHoverCursor = (mapProvider, enabled, interactionMode, dataLayers) => {
  useEffect(() => {
    const canSelect = enabled && (interactionMode === 'select' || interactionMode === 'auto')
    const layerIds = canSelect ? dataLayers.map(l => l.layerId) : []
    mapProvider.setHoverCursor?.(layerIds)
    return () => mapProvider.setHoverCursor?.([])
  }, [enabled, interactionMode, dataLayers])
}
