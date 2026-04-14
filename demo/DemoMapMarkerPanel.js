import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const MARKER_COORDS = [-2.9631008, 54.432306]
const MARKER_ID = 'my-marker'
const PANEL_ID = 'marker-info'

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

      const map = new InteractiveMap('demo-map-marker-panel', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: MARKER_COORDS,
        zoom: 15,
        containerHeight: '500px',
        enableZoomControls: true,
        plugins: [interactPlugin]
      })

      map.on('map:ready', () => {
        map.addMarker(MARKER_ID, MARKER_COORDS)
        interactPlugin.enable()
        interactPlugin.selectMarker(MARKER_ID)

        map.addPanel(PANEL_ID, {
          label: 'Marker',
          html: '<p class="govuk-body">Information about the selected marker</p>',
          mobile: { slot: 'drawer', dismissible: true },
          tablet: { slot: 'left-top', dismissible: true, width: '280px' },
          desktop: { slot: 'left-top', dismissible: true, width: '280px' }
        })
      })

      map.on('interact:selectionchange', ({ selectedMarkers }) => {
        if (selectedMarkers.length > 0) {
          map.showPanel(PANEL_ID)
        } else {
          map.hidePanel(PANEL_ID)
        }
      })

      map.on('app:panelclosed', ({ panelId }) => {
        if (panelId === PANEL_ID) {
          interactPlugin.unselectMarker(MARKER_ID)
        }
      })

    })
  }, [])

  return <div id='demo-map-marker-panel' className='app-no-prose app-example'></div>
}

export default function DemoMapMarkerPanel () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
