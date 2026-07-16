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
const PANEL_ID = 'marker-info'

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

      const map = new InteractiveMap('demo-map-marker-panel', {
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
        map.addMarker(MARKER_ID, MARKER_COORDS)
        interactPlugin.enable()
        interactPlugin.selectMarker(MARKER_ID)

        map.addPanel(PANEL_ID, {
          focus: false,
          label: 'Marker',
          html: '<p class="govuk-body govuk-!-margin-bottom-0">Information about the selected marker</p>',
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
