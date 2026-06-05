import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const CENTER = [-1.5491, 53.8008]
const PANEL_ID = 'building-info'

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
        interactionModes: ['selectFeature'],
        deselectOnClickOutside: true,
        debug: true,
        layers: [
          { layerId: 'buildings 3D', idProperty: 'uuid' }
        ]
      })

      const map = new InteractiveMap('demo-map-select-building', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: CENTER,
        zoom: 17,
        containerHeight: '500px',
        plugins: [interactPlugin]
      })

      map.on('map:ready', () => {
        interactPlugin.enable()

        map.addPanel(PANEL_ID, {
          focus: false,
          label: 'Selected building',
          html: '<div id="building-info-content"></div>',
          mobile: { slot: 'drawer', dismissible: true, open: false },
          tablet: { slot: 'left-top', dismissible: true, width: '300px', open: false },
          desktop: { slot: 'left-top', dismissible: true, width: '300px', open: false }
        })
      })

      map.on('interact:selectionchange', ({ selectedFeatures }) => {
        if (selectedFeatures.length > 0) {
          let html = ''
          for (const [k, v] of Object.entries(selectedFeatures[0].properties)) {
            html += `<p class="govuk-body govuk-!-margin-bottom-1"><strong>${k}:</strong> ${v}</p>`
          }
          document.getElementById('building-info-content').innerHTML = html
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

  return <div id='demo-map-select-building' className='app-no-prose app-example'></div>
}

export default function DemoMapSelectBuilding () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
