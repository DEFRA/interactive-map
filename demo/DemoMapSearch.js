import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, OS_NAMES_URL, useOsTransformRequest, useOsGeocodeTransformRequest } from './osMapStyle.js'

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

function MapInner () {
  const initialised = useRef(false)
  const transformRequest = useOsTransformRequest()
  const geocodeTransformRequest = useOsGeocodeTransformRequest()

  useEffect(() => {
    if (initialised.current) {
      return
    }
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/search/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createSearchPlugin }
    ]) => {
      const searchPlugin = createSearchPlugin({
        osNamesURL: OS_NAMES_URL,
        transformRequest: geocodeTransformRequest,
        width: '300px'
      })

      new InteractiveMap('demo-map-search', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        transformRequest,
        center: [-2.9631008, 54.432306],
        zoom: 6,
        containerHeight: '516px',
        plugins: [searchPlugin]
      })
    })
  }, [])

  return <div id='demo-map-search' className='app-no-prose app-example'></div>
}

export default function DemoMapSearch () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
