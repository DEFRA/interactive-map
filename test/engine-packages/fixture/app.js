// The consumer app every engine package check builds: an inline map with the datasets and draw
// plugins, so their engine adapters load too. Reads its settings from the page's
// #engine-config JSON and records progress on window.engineChecks for the check to read.

const testArea = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Test area' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[-1.52, 52.99], [-1.48, 52.99], [-1.48, 53.01], [-1.52, 53.01], [-1.52, 52.99]]]
    }
  }]
}

export const startMap = ({ InteractiveMap, createDatasetsPlugin, createDrawPlugin }) => {
  const config = JSON.parse(document.getElementById('engine-config').textContent)
  const checks = window.engineChecks

  const map = new InteractiveMap('map', {
    behaviour: 'inline',
    // Relative to the page, written out by hand so a tile template's {z}/{x}/{y} aren't encoded
    mapStyle: { ...config.mapStyle, url: `${window.location.origin}/${config.mapStyle.url}` },
    center: config.center,
    zoom: config.zoom,
    mapProviderOptions: config.mapProviderOptions,
    plugins: [
      createDatasetsPlugin({
        datasets: [{
          id: 'test-area',
          label: 'Test area',
          geojson: testArea,
          showInMenu: true,
          style: { stroke: '#d4351c', strokeWidth: 2, fill: 'transparent' }
        }]
      }),
      createDrawPlugin()
    ]
  })

  map.on('map:ready', () => { checks.mapReady = true })
  map.on('map:firstidle', () => { checks.firstIdle = true })
}
