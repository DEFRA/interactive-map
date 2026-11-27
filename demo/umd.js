const datasetsPlugin = defra.datasetsPlugin({
  datasets: [
    {
      id: 'demo-areas',
      label: 'Demo areas',
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-0.15, 51.52],
                [-0.1, 51.52],
                [-0.1, 51.49],
                [-0.15, 51.49],
                [-0.15, 51.52]
              ]]
            }
          }
        ]
      },
      showInKey: true,
      showInMenu: true,
      style: {
        stroke: '#d4351c',
        strokeWidth: 2,
        fill: 'rgba(212, 53, 28, 0.1)'
      }
    }
  ]
})

const interactiveMap = new defra.InteractiveMap('map', {
  behaviour: 'hybrid',
  mapProvider: defra.maplibreProvider(),
  mapStyle: {
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  center: [-0.12, 51.505],
  zoom: 11,
  containerHeight: '500px',
  plugins: [datasetsPlugin]
})

interactiveMap.on('map:ready', function () {
  console.log('map:ready — datasets plugin (MapLibre bundle) loaded successfully')
})

// Two more maps whose datasets share an id but not their data, so each map must keep its own
const createPointFeature = (name, coordinates) => ({
  type: 'Feature',
  properties: { name },
  geometry: { type: 'Point', coordinates }
})

const createAreaFeature = (name, [west, south, east, north]) => ({
  type: 'Feature',
  properties: { name },
  geometry: {
    type: 'Polygon',
    coordinates: [[[west, north], [east, north], [east, south], [west, south], [west, north]]]
  }
})

const londonPoints = {
  type: 'FeatureCollection',
  features: [
    createPointFeature('Trafalgar Square', [-0.1281, 51.508]),
    createPointFeature('St Paul’s Cathedral', [-0.0984, 51.5138]),
    createPointFeature('Tower of London', [-0.0759, 51.5081])
  ]
}

const manchesterAreas = {
  type: 'FeatureCollection',
  features: [
    createAreaFeature('Piccadilly Gardens', [-2.2378, 53.4803, -2.2348, 53.4818]),
    createAreaFeature('Castlefield', [-2.2575, 53.4735, -2.2505, 53.4770])
  ]
}

const createDatasetMap = (id, center, dataset) => new defra.InteractiveMap(id, {
  behaviour: 'inline',
  mapProvider: defra.maplibreProvider(),
  mapStyle: {
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  center,
  zoom: 13,
  containerHeight: '400px',
  plugins: [defra.datasetsPlugin({ datasets: [{ id: 'features', showInMenu: false, ...dataset }] })]
})

createDatasetMap('map-2', [-0.1, 51.511], {
  label: 'London places',
  geojson: londonPoints,
  style: {
    symbol: 'circle',
    symbolBackgroundColor: '#1d70b8',
    symbolForegroundColor: '#ffffff'
  }
})

createDatasetMap('map-3', [-2.246, 53.477], {
  label: 'Manchester areas',
  geojson: manchesterAreas,
  style: {
    stroke: '#00703c',
    strokeWidth: 2,
    fill: 'rgba(0, 112, 60, 0.2)'
  }
})
