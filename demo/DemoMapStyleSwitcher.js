import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import outdoorThumb from '../docs/assets/images/outdoor-ozs-map-thumb.jpg'
import nightThumb from '../docs/assets/images/night-ozs-map-thumb.jpg'
import deuteranopiaThumb from '../docs/assets/images/deuteranopia-ozs-map-thumb.jpg'
import tritanopiaThumb from '../docs/assets/images/tritanopia-ozs-map-thumb.jpg'

const ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

const MAP_STYLES = [
  {
    id: 'outdoor',
    label: 'Outdoor',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
    thumbnail: outdoorThumb,
    attribution: ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'night',
    label: 'Night',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-night/style.json',
    thumbnail: nightThumb,
    attribution: ATTRIBUTION,
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-deuteranopia/style.json',
    thumbnail: deuteranopiaThumb,
    attribution: ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-tritanopia/style.json',
    thumbnail: tritanopiaThumb,
    attribution: ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  }
]

function MapInner () {
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/map-styles/src/index.js')
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
        mapStyle: MAP_STYLES[0],
        center: [-0.1276, 51.5074],
        zoom: 12,
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
