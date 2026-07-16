import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const CENTER = [-2.9631008, 54.432306]

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

function MapInner () {
  const initialised = useRef(false)
  const transformRequest = useOsTransformRequest()

  useEffect(() => {
    if (!initialised.current) {
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
          transformRequest,
          center: CENTER,
          zoom: 15,
          hasExitButton: true
        })
      })
    }
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
