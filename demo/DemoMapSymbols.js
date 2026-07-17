import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const MAP_STYLE = {
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

// GeoJSON can also be loaded from a URL; use the tiles property for vector tile sources
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { category: 'prehistoric', name: 'Prehistoric feature' },
    geometry: { type: 'Point', coordinates: [-2.4615, 54.5616] }
  }, {
    type: 'Feature',
    properties: { category: 'roman', name: 'Roman feature' },
    geometry: { type: 'Point', coordinates: [-2.4628, 54.5541] }
  }, {
    type: 'Feature',
    properties: { category: 'medieval', name: 'Medieval feature' },
    geometry: { type: 'Point', coordinates: [-2.4578, 54.5569] }
  }]
}

const symbolGraphic = 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z'

const historicMonumentsDataset = {
  id: 'historic-monuments',
  label: 'Historic monuments',
  geojson: geojson,
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  sublayers: [{
    id: 'prehistoric',
    label: 'Prehistoric',
    filter: ['in', ['get', 'category'], 'prehistoric'],
    style: {
      symbol: 'square',
      symbolGraphic,
      symbolBackgroundColor: '#00897B'
    }
  }, {
    id: 'roman',
    label: 'Roman',
    filter: ['in', ['get', 'category'], 'roman'],
    style: {
      symbol: 'square',
      symbolGraphic,
      symbolBackgroundColor: '#ca3535'
    }
  }, {
    id: 'medieval',
    label: 'Medieval',
    filter: ['in', ['get', 'category'], 'medieval'],
    style: {
      symbol: 'square',
      symbolGraphic,
      symbolBackgroundColor: '#1565C0'
    }
  }]
}

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
      import('../plugins/beta/datasets/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createDatasetsPlugin }
    ]) => {
      const datasetsPlugin = createDatasetsPlugin({
        datasets: [historicMonumentsDataset]
      })

      new InteractiveMap('demo-map-symbols', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        transformRequest,
        center: [-2.4608,54.5574],
        zoom: 14,
        containerHeight: '516px',
        plugins: [datasetsPlugin]
      })
    })
  }, [])

  return <div id='demo-map-symbols' className='app-no-prose app-example'></div>
}

export default function DemoMapSymbols () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
