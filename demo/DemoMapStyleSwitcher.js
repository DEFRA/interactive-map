import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import outdoorThumb from '../docs/assets/images/outdoor-map-thumb.jpg'
import darkThumb from '../docs/assets/images/dark-map-thumb.jpg'
import blackWhiteThumb from '../docs/assets/images/black-and-white-map-thumb.jpg'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const MAP_STYLES = [
  {
    id: 'outdoor',
    label: 'Outdoor',
    url: OS_VTS_STYLE_URLS.outdoor,
    thumbnail: outdoorThumb,
    attribution: OS_ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'dark',
    label: 'Dark',
    url: OS_VTS_STYLE_URLS.dark,
    thumbnail: darkThumb,
    attribution: OS_ATTRIBUTION,
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  },
  {
    id: 'blackWhite',
    label: 'Black/White',
    url: OS_VTS_STYLE_URLS.blackWhite,
    thumbnail: blackWhiteThumb,
    attribution: OS_ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  }
]

function MapInner () {
  const initialised = useRef(false)
  const transformRequest = useOsTransformRequest()

  useEffect(() => {
    if (initialised.current) { return }
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/beta/map-styles/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createMapStylesPlugin }
    ]) => {
      const mapStylesPlugin = createMapStylesPlugin({
        mapStyles: MAP_STYLES,
        manifest: {
          buttons: [{ id: 'mapStyles', mobile: { slot: 'top-left', showLabel: true } }]
        }
      })

      new InteractiveMap('demo-map-style-switcher', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        transformRequest,
        center: [-2.9631008, 54.432306],
        zoom: 15,
        containerHeight: '516px',
        plugins: [mapStylesPlugin]
      })
    })
  }, [])

  return <div id='demo-map-style-switcher' className='app-no-prose app-example'></div>
}

export default function DemoMapStyleSwitcher () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
