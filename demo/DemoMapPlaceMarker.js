import { useEffect, useRef, useState } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const CENTER = [-2.9631008, 54.432306]
const ZOOM = 15

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

function MapInner () {
  const initialised = useRef(false)
  const transformRequest = useOsTransformRequest()
  const [mapReady, setMapReady] = useState(false)
  const [isInline, setIsInline] = useState(false)
  const [markerCoords, setMarkerCoords] = useState(null)

  useEffect(() => {
    if (initialised.current) {
      return
    }
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/interact/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createInteractPlugin }
    ]) => {
      const interactPlugin = createInteractPlugin({
        interactionModes: ['placeMarker']
      })

      const map = new InteractiveMap('demo-map-place-marker', {
        behaviour: 'hybrid',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        transformRequest,
        center: CENTER,
        zoom: ZOOM,
        containerHeight: '516px',
        plugins: [interactPlugin],
        backAndContinue: {
          backLabel: 'Back',
          continueLabel: 'Continue',
          continueEnabledWhen: ({ mapState }) =>
            mapState.markers.items.some(m => m.id === 'location')
        }
      })

      map.on('map:ready', () => {
        interactPlugin.enable()
        setMapReady(true)
      })

      map.on('app:opened', ({ isFullscreen }) => {
        setIsInline(!isFullscreen)
      })

      map.on('app:closed', () => {
        setIsInline(false)
      })

      map.on('app:fullscreenchange', ({ isFullscreen }) => {
        setIsInline(!isFullscreen)
      })

      map.on('interact:markerchange', ({ coords }) => {
        setMarkerCoords(coords)
      })

      map.on('app:continue', ({ mapState }) => {
        const marker = mapState.markers.items.find(m => m.id === 'location')
        if (marker) {
          console.log('Continuing with marker at:', marker.coords)
        }
      })
    })
  }, [])

  const showButtons = mapReady && isInline

  return (
    <div className='app-no-prose app-example'>
      <div id='demo-map-place-marker'></div>
      {showButtons && (
        <div className='govuk-button-group govuk-!-margin-top-4'>
          <button
            className='govuk-button'
            type='button'
            disabled={!markerCoords}
            onClick={() => console.log('Continuing with marker at:', markerCoords)}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

export default function DemoMapPlaceMarker () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
