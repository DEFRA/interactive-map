const datasetsPlugin = defra.datasetsMaplibrePlugin({
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
  console.log('map:ready — combined datasets maplibre plugin loaded successfully')
})
