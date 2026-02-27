import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import useBaseUrl from '@docusaurus/useBaseUrl'

const OS_ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

function buildMapStyles (thumbnailUrl) {
  return [
    {
      id: 'outdoor',
      label: 'Outdoor',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
      thumbnail: thumbnailUrl,
      attribution: OS_ATTRIBUTION,
      backgroundColor: '#f5f5f0'
    },
    {
      id: 'night',
      label: 'Night',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-night/style.json',
      thumbnail: thumbnailUrl,
      mapColorScheme: 'dark',
      appColorScheme: 'dark',
      attribution: OS_ATTRIBUTION
    },
    {
      id: 'deuteranopia',
      label: 'Deuteranopia',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-deuteranopia/style.json',
      thumbnail: thumbnailUrl,
      attribution: OS_ATTRIBUTION
    },
    {
      id: 'tritanopia',
      label: 'Tritanopia',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-tritanopia/style.json',
      thumbnail: thumbnailUrl,
      attribution: OS_ATTRIBUTION
    }
  ]
}

function MapInner ({ mapStyles }) {
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/search/src/index.js'),
      import('../plugins/beta/scale-bar/src/index.js'),
      import('../plugins/beta/map-styles/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: searchPlugin },
      { default: scaleBarPlugin },
      { default: mapStylesPlugin }
    ]) => {
      const nominatimDataset = {
        name: 'nominatim',
        urlTemplate: 'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=8&countrycodes=gb',
        parseResults: (json, query) => {
          if (!Array.isArray(json)) return []
          const esc = q => q.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
          const rx = new RegExp(`(${esc(query)})`, 'i')
          return json.map(r => {
            const [south, north, west, east] = r.boundingbox.map(Number)
            const lon = +r.lon
            const lat = +r.lat
            const full = r.display_name || ''
            const text = full.length > 80 ? `${full.slice(0, 79).trim()}…` : full
            const marked = text.replace(rx, '<mark>$1</mark>')
            return {
              id: String(r.place_id),
              bounds: [west, south, east, north],
              point: [lon, lat],
              text,
              marked,
              type: 'nominatim'
            }
          })
        }
      }

      // eslint-disable-next-line no-new
      new InteractiveMap('demo-map-button', {
        behaviour: 'buttonFirst',
        mapProvider: maplibreProvider(),
        mapStyle: mapStyles[0],
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '500px',
        enableZoomControls: true,
        plugins: [
          searchPlugin({ customDatasets: [nominatimDataset], showMarker: true }),
          scaleBarPlugin({ units: 'metric' }),
          mapStylesPlugin({ mapStyles })
        ]
      })
    })
  }, [])
  return <div id='demo-map-button'></div>
}

export default function DemoMapButton () {
  const thumbnailUrl = useBaseUrl('/images/outdoor-map-thumb.jpg')
  const mapStyles = buildMapStyles(thumbnailUrl)

  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner mapStyles={mapStyles} />}
    </BrowserOnly>
  )
}
