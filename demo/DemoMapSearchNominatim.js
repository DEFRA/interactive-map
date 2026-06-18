import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const markQuery = (text, query) => {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'i'), '<mark>$1</mark>')
}

const SETTLEMENT_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood', 'municipality', 'borough', 'district', 'county'])

const nominatimDataset = {
  name: 'nominatim',
  buildRequest: (query) => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '8',
      countrycodes: 'gb'
    })
    return new Request(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'en' }
    })
  },
  parseResults: (json, query) => {
    if (!Array.isArray(json)) {
      return []
    }
    const results = json.filter(item => SETTLEMENT_TYPES.has(item.addresstype)).map(item => {
      // Nominatim boundingbox: [min_lat, max_lat, min_lon, max_lon]
      const [minLat, maxLat, minLon, maxLon] = item.boundingbox.map(Number)
      return {
        id: String(item.place_id),
        text: item.display_name,
        marked: markQuery(item.display_name, query),
        point: [Number(item.lon), Number(item.lat)],
        bounds: [minLon, minLat, maxLon, maxLat]
      }
    })
    return Array.from(new Map(results.map(r => [r.text, r])).values())
  }
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
      import('../providers/maplibre/src/index.js'),
      import('../plugins/search/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createSearchPlugin }
    ]) => {
      const searchPlugin = createSearchPlugin({
        customDatasets: [nominatimDataset],
        width: '300px'
      })

      new InteractiveMap('demo-map-search-control', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '516px',
        plugins: [searchPlugin]
      })
    })
  }, [])

  return <div id='demo-map-search-control' className='app-no-prose app-example'></div>
}

export default function DemoMapSearchNominatim () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
