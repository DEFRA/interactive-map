import { useEffect } from 'react'
import { getMediaState } from '../../utils/getMediaState.js'

export function useMediaQueryDispatch (dispatch, options) {
  const { appColorScheme, autoColorScheme, behaviour, hybridWidth, maxMobileWidth } = options

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-reduced-motion: reduce)')
    ]

    function updateMedia () {
      const { preferredColorScheme, prefersReducedMotion } = getMediaState()

      dispatch({
        type: 'SET_MEDIA',
        payload: {
          preferredColorScheme: autoColorScheme ? preferredColorScheme : appColorScheme,
          prefersReducedMotion
        }
      })
    }

    queries.forEach(query => query.addEventListener('change', updateMedia))

    // Hybrid behaviour: listen to media query width changes
    let hybridQuery = null
    let updateHybridFullscreen = null
    if (behaviour === 'hybrid') {
      const threshold = hybridWidth ?? maxMobileWidth
      hybridQuery = window.matchMedia(`(max-width: ${threshold}px)`)

      updateHybridFullscreen = (e) => {
        dispatch({
          type: 'SET_HYBRID_FULLSCREEN',
          payload: e.matches
        })
      }

      hybridQuery.addEventListener('change', updateHybridFullscreen)
    }

    return () => {
      queries.forEach(query => query.removeEventListener('change', updateMedia))
      if (hybridQuery && updateHybridFullscreen) {
        hybridQuery.removeEventListener('change', updateHybridFullscreen)
      }
    }
  }, [dispatch, behaviour, hybridWidth, maxMobileWidth])
}
