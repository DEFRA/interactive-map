import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const pointData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { category: 'prehistoric', name: 'Prehistoric feature' },
    geometry: { coordinates: [-2.4558622, 54.5617135], type: 'Point' }
  }, {
    type: 'Feature',
    properties: { category: 'roman', name: 'Roman feature' },
    geometry: { coordinates: [-2.439823, 54.5525437], type: 'Point' }
  }, {
    type: 'Feature',
    properties: { category: 'medieval', name: 'Medieval feature' },
    geometry: { coordinates: [-2.4481939, 54.5575261], type: 'Point' }
  }]
}

const historicMonumentsDataset = {
  id: 'historic-monuments',
  label: 'Historic monuments',
  geojson: pointData,
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  sublayers: [{
    id: 'prehistoric',
    label: 'Prehistoric',
    filter: ['in', ['get', 'category'], 'prehistoric'],
    showInMenu: true,
    style: {
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z',
      symbolBackgroundColor: '#00897B'
    }
  }, {
    id: 'roman',
    label: 'Roman',
    filter: ['in', ['get', 'category'], 'roman'],
    showInMenu: true,
    style: {
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z',
      symbolBackgroundColor: '#ca3535'
    }
  }, {
    id: 'medieval',
    label: 'Medieval',
    filter: ['in', ['get', 'category'], 'medieval'],
    showInMenu: true,
    style: {
      symbol: 'square',
      symbolGraphic: 'M3 15H1V1h2v2h2V1h2v5h2V4h2v2h2V4h2v11H6V9H3v6z',
      symbolBackgroundColor: '#1565C0'
    }
  }]
}

function MapInner () {
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
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

      new InteractiveMap('demo-map-datasets', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: [-2.448, 54.557],
        zoom: 12,
        containerHeight: '516px',
        plugins: [datasetsPlugin]
      })
    })
  }, [])

  return <div id='demo-map-datasets' className='app-no-prose app-example'></div>
}

export default function DemoMapDatasets () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
