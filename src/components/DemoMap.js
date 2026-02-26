import React, { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import useBaseUrl from '@docusaurus/useBaseUrl'

const OS_ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

function buildMapStyles (logoUrl, logoWhiteUrl) {
  return [
    {
      id: 'outdoor',
      label: 'Outdoor',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
      thumbnail: '',
      logo: logoUrl,
      logoAltText: 'Ordnance Survey logo',
      attribution: OS_ATTRIBUTION,
      backgroundColor: '#f5f5f0'
    },
    {
      id: 'night',
      label: 'Night',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-night/style.json',
      thumbnail: '',
      logo: logoWhiteUrl,
      logoAltText: 'Ordnance Survey logo',
      mapColorScheme: 'dark',
      appColorScheme: 'dark',
      attribution: OS_ATTRIBUTION
    },
    {
      id: 'deuteranopia',
      label: 'Deuteranopia',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-deuteranopia/style.json',
      thumbnail: '',
      logo: logoUrl,
      logoAltText: 'Ordnance Survey logo',
      attribution: OS_ATTRIBUTION
    },
    {
      id: 'tritanopia',
      label: 'Tritanopia',
      url: 'https://labs.os.uk/tiles/styles/open-zoomstack-tritanopia/style.json',
      thumbnail: '',
      logo: logoUrl,
      logoAltText: 'Ordnance Survey logo',
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
      import('../../src/index.js'),
      import('../../providers/maplibre/src/index.js'),
      import('../../plugins/search/src/index.js'),
      import('../../plugins/beta/scale-bar/src/index.js'),
      import('../../plugins/beta/map-styles/src/index.js')
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
          return json.map(r => {
            const [south, north, west, east] = r.boundingbox.map(Number)
            const lon = parseFloat(r.lon)
            const lat = parseFloat(r.lat)
            const text = r.display_name
            const marked = text.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'), '<mark>$1</mark>')
            return { id: String(r.place_id), bounds: [west, south, east, north], point: [lon, lat], text, marked, type: 'nominatim' }
          })
        }
      }

      // eslint-disable-next-line no-new
      new InteractiveMap('demo-map', {
        behaviour: 'inline',
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

  return <div id='demo-map' />
}

export default function DemoMap () {
  const logoUrl = useBaseUrl('/img/os-logo.svg')
  const logoWhiteUrl = useBaseUrl('/img/os-logo-white.svg')
  const mapStyles = buildMapStyles(logoUrl, logoWhiteUrl)

  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner mapStyles={mapStyles} />}
    </BrowserOnly>
  )
}
