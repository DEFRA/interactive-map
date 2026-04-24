import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const MARKER_COORDS = [-2.9631008, 54.432306]
const MARKER_ID = 'my-marker'

function MapInner () {
  const initialised = useRef(false)

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
        deselectOnClickOutside: true
      })

      const map = new InteractiveMap('demo-map-toggle-marker-label', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: MARKER_COORDS,
        zoom: 15,
        containerHeight: '500px',
        plugins: [interactPlugin]
      })

      map.on('map:ready', () => {
        map.addMarker(MARKER_ID, MARKER_COORDS, {
          label: 'My location',
          showLabel: false
        })
        interactPlugin.enable()
      })

      map.on('interact:selectionchange', ({ selectedMarkers }) => {
        map.updateMarker(MARKER_ID, { showLabel: selectedMarkers.includes(MARKER_ID) })
      })
    })
  }, [])

  return <div id='demo-map-toggle-marker-label' className='app-no-prose app-example'></div>
}

export default function DemoMapToggleMarkerLabel () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
