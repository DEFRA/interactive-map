import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'
import { geojson } from './DemoMapPolygons.js'

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

// Same field parcels as the Add polygons demo — a plain, single-style dataset
// (no sublayers, no key/menu entry) purely so there's something with real ids and
// properties to click on. The Open VTS style's own layers have neither.
const parcelsDataset = {
  id: 'field-parcels',
  geojson,
  minZoom: 10,
  maxZoom: 24,
  style: {
    fill: 'rgba(29, 112, 184, 0.1)',
    stroke: '#1d70b8',
    strokeWidth: 2
  }
}

// This dataset's geometry sits near Ambleside's field parcels, not the wider area
// used by the other demos, so it needs its own center to actually be on screen
const CENTER = [-2.464,54.5585475]
const PANEL_ID = 'parcel-info'

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
      import('../plugins/interact/src/index.js'),
      import('../plugins/beta/datasets/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createInteractPlugin },
      { default: createDatasetsPlugin }
    ]) => {
      const datasetsPlugin = createDatasetsPlugin({
        datasets: [parcelsDataset]
      })

      const interactPlugin = createInteractPlugin({
        interactionModes: ['selectFeature'],
        deselectOnClickOutside: true,
        layers: [
          { layerId: 'field-parcels', idProperty: 'name' }
        ]
      })

      const map = new InteractiveMap('demo-map-select-feature', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        transformRequest,
        center: CENTER,
        zoom: 14,
        containerHeight: '516px',
        plugins: [datasetsPlugin, interactPlugin]
      })

      map.on('map:ready', () => {
        interactPlugin.enable()

        map.addPanel(PANEL_ID, {
          focus: false,
          label: 'Selected parcel',
          html: '<div id="parcel-info-content"></div>',
          mobile: { slot: 'drawer', dismissible: true, open: false },
          tablet: { slot: 'left-top', dismissible: true, width: '300px', open: false },
          desktop: { slot: 'left-top', dismissible: true, width: '300px', open: false }
        })
      })

      map.on('interact:selectionchange', ({ selectedFeatures }) => {
        if (selectedFeatures.length > 0) {
          const { name } = selectedFeatures[0].properties
          document.getElementById('parcel-info-content').innerHTML =
            `<p class="govuk-body govuk-!-margin-bottom-1">${name}</p>`
          map.showPanel(PANEL_ID)
        } else {
          map.hidePanel(PANEL_ID)
        }
      })

      map.on('app:panelclosed', ({ panelId }) => {
        if (panelId === PANEL_ID) {
          interactPlugin.clear()
        }
      })
    })
  }, [])

  return <div id='demo-map-select-feature' className='app-no-prose app-example'></div>
}

export default function DemoMapSelectFeature () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
