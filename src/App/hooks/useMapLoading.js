import { useEffect, useLayoutEffect, useState } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'

/**
 * Move the loading overlay into the app when it mounts, and track whether the
 * map is still loading. React clears the map container on its first render,
 * and a layout effect puts the overlay back before the browser paints.
 *
 * @returns {boolean} Whether the map is still loading.
 */
export function useMapLoading () {
  const { mapLoading } = useConfig()
  const { layoutRefs } = useApp()
  const [isMapLoading, setIsMapLoading] = useState(() => Boolean(mapLoading?.isLoading()))

  useLayoutEffect(() => {
    mapLoading?.attachTo(layoutRefs.appContainerRef.current)
  }, [])

  useEffect(() => {
    if (!mapLoading) {
      return undefined
    }
    const stopListening = mapLoading.onDismiss(() => setIsMapLoading(false))
    // Loading may have ended between the first render and this effect
    if (!mapLoading.isLoading()) {
      setIsMapLoading(false)
    }
    return stopListening
  }, [])

  return isMapLoading
}
