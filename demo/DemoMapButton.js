import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

function MapInner () {
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) {
      return
    }
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider }
    ]) => {
      // eslint-disable-next-line no-new
      new InteractiveMap('demo-map-button', {
        behaviour: 'buttonFirst',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: [-2.9631008,54.432306],
        zoom: 15,
        hasExitButton: true
      })
    })
  }, [])
  return <div id='demo-map-button' className='app-no-prose app-example'></div>
}

export default function DemoMapButton () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
