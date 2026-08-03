import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

const MARKER_COORDS = [-2.9631008, 54.432306]
const MARKER_ID = 'my-marker'

function MapInner () {
  const initialised = useRef(false)
  const transformRequest = useOsTransformRequest()

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
        transformRequest,
        center: MARKER_COORDS,
        zoom: 15,
        containerHeight: '516px',
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
