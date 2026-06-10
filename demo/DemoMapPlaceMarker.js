import { useEffect, useRef, useState } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const CENTER = [-0.1276, 51.5074]
const ZOOM = 12

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

function MapInner () {
  const initialised = useRef(false)
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
          <button className='govuk-button' type='button' disabled={!markerCoords}>
            Continue
          </button>
          {markerCoords && (
            <p className='govuk-body govuk-!-margin-bottom-0'>
              Marker at {markerCoords[1].toFixed(5)}°N, {markerCoords[0].toFixed(5)}°
            </p>
          )}
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
