import { useEffect, useRef, useState } from 'react'
import { waitFor, expect, within, userEvent } from '@storybook/test'

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
  play: async ({ canvasElement }) => {
    await waitForCanvas(canvasElement)
    await waitFor(
      () => expect(canvasElement.querySelector('.im-c-scale-bar')).not.toBeNull(),
      { timeout: 5000 }
    )
  }
}

export const WithMapStyles = {
  args: {
    buildPlugins: async () => {
      const { default: mapStylesPlugin } = await import('../plugins/beta/map-styles/src/index.js')
      return [mapStylesPlugin({ mapStyles: MAP_STYLES })]
    }
  },
  play: async ({ canvasElement }) => {
    await waitForCanvas(canvasElement)
    const canvas = within(canvasElement)
    // Open the map styles panel
    const stylesButton = await canvas.findByRole('button', { name: /styles/i }, { timeout: 5000 })
    await userEvent.click(stylesButton)
    // Panel is now open — one style button should be active
    await waitFor(
      () => expect(canvasElement.querySelector('[aria-pressed="true"]')).not.toBeNull(),
      { timeout: 5000 }
    )
  }
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

function DrawMLStory () {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)
  const drawPluginRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [drawnFeatures, setDrawnFeatures] = useState([])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/beta/draw-ml/src/index.js')
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }, { default: createDrawPlugin }]) => {
      if (cancelled) return

      drawPluginRef.current = createDrawPlugin({})
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
        plugins: [drawPluginRef.current]
      })

      mapRef.current.on('draw:ready', () => setReady(true))
      mapRef.current.on('draw:created', (feature) => setDrawnFeatures(prev => [...prev, feature]))
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  return (
    <div>
      <ul hidden aria-hidden="true" data-testid="drawn-features">
        {drawnFeatures.map(f => (
          <li key={f.id} data-geometry-type={f.geometry.type} />
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          disabled={!ready}
          onClick={() => drawPluginRef.current.newPolygon(crypto.randomUUID())}
        >
          New polygon
        </button>
        <button
          disabled={!ready}
          onClick={() => drawPluginRef.current.newLine(crypto.randomUUID())}
        >
          New line
        </button>
      </div>
      <div id={id} style={{ minHeight: '50px' }} />
    </div>
  )
}

export const WithDrawML = {
  render: () => <DrawMLStory />,
  play: async ({ canvasElement }) => {
    await waitForCanvas(canvasElement)
    const canvas = within(canvasElement)

    // draw:ready enables the control buttons
    const [newPolygonButton, newLineButton] = await Promise.all([
      canvas.findByRole('button', { name: 'New polygon' }, { timeout: 10000 }),
      canvas.findByRole('button', { name: 'New line' }, { timeout: 10000 })
    ])
    await waitFor(() => {
      expect(newPolygonButton).not.toBeDisabled()
      expect(newLineButton).not.toBeDisabled()
    }, { timeout: 10000 })

    const mapCanvas = canvasElement.querySelector('canvas')
    const rect = mapCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const clickAt = (dx, dy) => mapCanvas.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0, clientX: cx + dx, clientY: cy + dy })
    )
    const dblclickAt = (dx, dy) => {
      const opts = { bubbles: true, cancelable: true, view: window, button: 0, clientX: cx + dx, clientY: cy + dy }
      mapCanvas.dispatchEvent(new MouseEvent('click', opts))
      mapCanvas.dispatchEvent(new MouseEvent('dblclick', opts))
    }

    const drawnList = canvasElement.querySelector('[data-testid="drawn-features"]')

    // Draw a square: click 4 corners, double-click to finish
    await userEvent.click(newPolygonButton)
    clickAt(-60, -60) // top-left
    clickAt(60, -60)  // top-right
    clickAt(60, 60)   // bottom-right
    dblclickAt(-60, 60) // bottom-left + finish
    await waitFor(
      () => expect(drawnList.querySelector('[data-geometry-type="Polygon"]')).not.toBeNull(),
      { timeout: 5000 }
    )

    // Draw a line: click start + end, double-click to finish
    await userEvent.click(newLineButton)
    clickAt(-60, 0)
    dblclickAt(60, 0)
    await waitFor(
      () => expect(drawnList.querySelector('[data-geometry-type="LineString"]')).not.toBeNull(),
      { timeout: 5000 }
    )
  }
}

function FrameStory () {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)
  const framePluginRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [hasFrame, setHasFrame] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../src/index.js'),
      import('../providers/maplibre/src/index.js'),
      import('../plugins/beta/frame/src/index.js')
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }, { default: createFramePlugin }]) => {
      if (cancelled) return

      framePluginRef.current = createFramePlugin({ aspectRatio: 1.5 })
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
        plugins: [framePluginRef.current]
      })

      mapRef.current.on('map:ready', () => setReady(true))
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  const handleAddFrame = () => {
    framePluginRef.current.addFrame('story-frame')
    setHasFrame(true)
  }

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <button disabled={!ready || hasFrame} onClick={handleAddFrame}>
          Add frame
        </button>
      </div>
      <div id={id} style={{ minHeight: '50px' }} />
    </div>
  )
}

export const WithFrame = {
  render: () => <FrameStory />,
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
        { default: createFramePlugin }
      ] = await Promise.all([
        import('../plugins/search/src/index.js'),
        import('../plugins/interact/src/index.js'),
        import('../plugins/beta/scale-bar/src/index.js'),
        import('../plugins/beta/map-styles/src/index.js'),
        import('../plugins/beta/use-location/src/index.js'),
        import('../plugins/beta/datasets/src/index.js'),
        import('../plugins/beta/frame/src/index.js')
      ])

      return [
        searchPlugin({ customDatasets: [nominatimDataset], showMarker: true }),
        createInteractPlugin({ interactionMode: 'marker' }),
        scaleBarPlugin({ units: 'metric' }),
        mapStylesPlugin({ mapStyles: MAP_STYLES }),
        useLocationPlugin(),
        createDatasetsPlugin({ datasets: [] }),
        createFramePlugin({ aspectRatio: 1.5 })
      ]
    },
    onReady: (map, plugins) => {
      const interactPlugin = plugins.find(p => p.id === 'interact')
      interactPlugin?.enable()
    }
  },
  play: async ({ canvasElement }) => { await waitForCanvas(canvasElement) }
}

// Shows the open-map button with all plugins loaded. Click manually to load the map.
export const ButtonFirstKitchenSink = {
  args: {
    mapConfig: { behaviour: 'buttonFirst', containerHeight: '500px' },
    buildPlugins: KitchenSink.args.buildPlugins,
    onReady: KitchenSink.args.onReady
  },
  play: async ({ canvasElement }) => {
    const { within } = await import('@storybook/test')
    await within(canvasElement).findByRole('button', {}, { timeout: 5000 })
  }
}
