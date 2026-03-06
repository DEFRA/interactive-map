import { useEffect, useRef } from 'react'
import { waitFor, expect } from '@storybook/test'

const nominatimDataset = {
  name: 'nominatim',
  urlTemplate: 'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=8&countrycodes=gb',
  parseResults: (json, query) => {
    if (!Array.isArray(json)) return []
    const esc = q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(`(${esc(query)})`, 'i')
    return json.map(r => {
      const [south, north, west, east] = r.boundingbox.map(Number)
      const text = (r.display_name || '').slice(0, 79)
      return {
        id: String(r.place_id),
        bounds: [west, south, east, north],
        point: [+r.lon, +r.lat],
        text,
        marked: text.replace(rx, '<mark>$1</mark>'),
        type: 'nominatim'
      }
    })
  }
}

const OS_ATTRIBUTION = `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`

const MAP_STYLES = [
  {
    id: 'outdoor',
    label: 'Outdoor',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
    attribution: OS_ATTRIBUTION,
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'night',
    label: 'Night',
    url: 'https://labs.os.uk/tiles/styles/open-zoomstack-night/style.json',
    attribution: OS_ATTRIBUTION,
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  }
]

// Sample dataset for the WithDatasets story — provides visible Layers UI
const SAMPLE_DATASET = {
  id: 'sample-points',
  label: 'Sample Points',
  showInLayers: true,
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-1.5491, 53.8008] }, properties: { name: 'Leeds' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-2.2426, 53.4808] }, properties: { name: 'Manchester' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-1.8904, 52.4862] }, properties: { name: 'Birmingham' } }
    ]
  },
  layers: [{
    id: 'sample-points-circle',
    type: 'circle',
    paint: { 'circle-radius': 8, 'circle-color': '#d4351c', 'circle-opacity': 0.8 }
  }]
}

let counter = 0

function PluginStory ({ buildPlugins, mapConfig = {}, onReady }) {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      buildPlugins()
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }, plugins]) => {
      if (cancelled) return

      mapRef.current = new InteractiveMap(id, {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: {
          id: 'outdoor',
          url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
          attribution: OS_ATTRIBUTION,
          backgroundColor: '#f5f5f0'
        },
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '500px',
        enableZoomControls: true,
        ...mapConfig,
        plugins
      })

      if (onReady) {
        mapRef.current.on('map:ready', () => onReady(mapRef.current, plugins))
      }
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  return <div id={id} style={{ minHeight: '50px' }} />
}

const waitForCanvas = async (canvasElement) => {
  await waitFor(
    () => expect(canvasElement.querySelector('canvas')).not.toBeNull(),
    { timeout: 15000 }
  )
}

export default {
  title: 'Plugins',
  render: (args) => <PluginStory {...args} />
}

export const WithSearch = {
  args: {
    buildPlugins: async () => {
      const { default: searchPlugin } = await import('../plugins/search/src/index.js')
      return [searchPlugin({ customDatasets: [nominatimDataset], showMarker: true })]
    }
  },
  play: async ({ canvasElement }) => {
    await waitForCanvas(canvasElement)
    await waitFor(
      () => expect(canvasElement.querySelector('[class*="search"]')).not.toBeNull(),
      { timeout: 5000 }
    )
  }
}

export const WithInteract = {
  args: {
    buildPlugins: async () => {
      const { default: createInteractPlugin } = await import('../plugins/interact/src/index.js')
      return [createInteractPlugin({ interactionMode: 'marker' })]
    },
    // The plugin starts disabled — enable it on map:ready (mirrors demo/js/index.js:175)
    onReady: (map, [interactPlugin]) => interactPlugin.enable()
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithScaleBar = {
  args: {
    buildPlugins: async () => {
      const { default: scaleBarPlugin } = await import('../plugins/beta/scale-bar/src/index.js')
      return [scaleBarPlugin({ units: 'metric' })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithMapStyles = {
  args: {
    buildPlugins: async () => {
      const { default: mapStylesPlugin } = await import('../plugins/beta/map-styles/src/index.js')
      return [mapStylesPlugin({ mapStyles: MAP_STYLES })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithUseLocation = {
  args: {
    buildPlugins: async () => {
      const { default: useLocationPlugin } = await import('../plugins/beta/use-location/src/index.js')
      return [useLocationPlugin()]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithDatasets = {
  args: {
    buildPlugins: async () => {
      const { default: createDatasetsPlugin } = await import('../plugins/beta/datasets/src/index.js')
      return [createDatasetsPlugin({ datasets: [SAMPLE_DATASET] })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithDrawML = {
  args: {
    buildPlugins: async () => {
      const { default: createDrawPlugin } = await import('../plugins/beta/draw-ml/src/index.js')
      return [createDrawPlugin({})]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const WithFrame = {
  args: {
    buildPlugins: async () => {
      const { default: createFramePlugin } = await import('../plugins/beta/frame/src/index.js')
      return [createFramePlugin({ aspectRatio: 1.5 })]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

export const KitchenSink = {
  args: {
    buildPlugins: async () => {
      const [
        { default: searchPlugin },
        { default: createInteractPlugin },
        { default: scaleBarPlugin },
        { default: mapStylesPlugin },
        { default: useLocationPlugin },
        { default: createDatasetsPlugin },
        { default: createDrawPlugin },
        { default: createFramePlugin }
      ] = await Promise.all([
        import('../plugins/search/src/index.js'),
        import('../plugins/interact/src/index.js'),
        import('../plugins/beta/scale-bar/src/index.js'),
        import('../plugins/beta/map-styles/src/index.js'),
        import('../plugins/beta/use-location/src/index.js'),
        import('../plugins/beta/datasets/src/index.js'),
        import('../plugins/beta/draw-ml/src/index.js'),
        import('../plugins/beta/frame/src/index.js')
      ])

      return [
        searchPlugin({ customDatasets: [nominatimDataset], showMarker: true }),
        createInteractPlugin({ interactionMode: 'marker' }),
        scaleBarPlugin({ units: 'metric' }),
        mapStylesPlugin({ mapStyles: MAP_STYLES }),
        useLocationPlugin(),
        createDatasetsPlugin({ datasets: [] }),
        createDrawPlugin({}),
        createFramePlugin({ aspectRatio: 1.5 })
      ]
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

// Shows the open-map button with all plugins loaded. Click manually to load the map.
export const ButtonFirstKitchenSink = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    buildPlugins: KitchenSink.args.buildPlugins
  },
  play: async ({ canvasElement }) => {
    const { within } = await import('@storybook/test')
    await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
  }
}
