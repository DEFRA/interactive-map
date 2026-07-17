import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { OS_VTS_STYLE_URLS, OS_ATTRIBUTION, useOsTransformRequest } from './osMapStyle.js'

const MAP_STYLE = {
  id: 'outdoor',
  url: OS_VTS_STYLE_URLS.outdoor,
  attribution: OS_ATTRIBUTION,
  backgroundColor: '#f5f5f0'
}

const DRAW_LAYERS = ['fill-inactive.cold', 'stroke-inactive.cold']
const ICON_POLYGON = '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>'
const ICON_LINE = '<path d="M5.706 16.294L16.294 5.706"/><path d="M21 2v3c0 .549-.451 1-1 1h-3c-.549 0-1-.451-1-1V2c0-.549.451-1 1-1h3c.549 0 1 .451 1 1zM6 17v3c0 .549-.451 1-1 1H2c-.549 0-1-.451-1-1v-3c0-.549.451-1 1-1h3c.549 0 1 .451 1 1z"/>'
const ICON_EDIT = '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'
const ICON_DELETE = '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'

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
      import('../plugins/interact/src/index.js'),
      import('../plugins/beta/draw-ml/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createInteractPlugin },
      { default: createDrawPlugin }
    ]) => {
      const interactPlugin = createInteractPlugin({
        layers: [
          { layerId: 'fill-inactive.cold', idProperty: 'id' },
          { layerId: 'stroke-inactive.cold', idProperty: 'id' }
        ],
        interactionModes: ['selectFeature'],
        multiSelect: true,
        deselectOnClickOutside: true
      })

      // Open VTS style has no 3D buildings layer — snap to woodland polygons instead
      const drawPlugin = createDrawPlugin({
        snapLayers: ['OS/Woodland:3/Local/1']
      })

      const interactiveMap = new InteractiveMap('demo-map-draw', {
        behaviour: 'hybrid',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        transformRequest,
        center: [-2.9631008, 54.432306],
        zoom: 15,
        containerHeight: '516px',
        plugins: [interactPlugin, drawPlugin],
        hasExitButton: true
      })

      let selectedFeatureIds = []

      interactiveMap.on('map:ready', () => {
        interactPlugin.enable()

        interactiveMap.addButton('drawTools', {
          label: 'Draw tools',
          mobile: { slot: 'bottom-right' },
          tablet: { slot: 'top-middle' },
          desktop: { slot: 'top-middle' },
          menuItems: [
            {
              id: 'drawPolygon',
              label: 'Draw polygon',
              iconSvgContent: ICON_POLYGON,
              onClick: () => {
                interactiveMap.toggleButtonState('drawTools', 'hidden', true)
                drawPlugin.newPolygon(crypto.randomUUID())
              }
            },
            {
              id: 'drawLine',
              label: 'Draw line',
              iconSvgContent: ICON_LINE,
              onClick: () => {
                interactiveMap.toggleButtonState('drawTools', 'hidden', true)
                drawPlugin.newLine(crypto.randomUUID())
              }
            },
            {
              id: 'editFeature',
              label: 'Edit feature',
              iconSvgContent: ICON_EDIT,
              isDisabled: true,
              onClick: () => {
                if (!drawPlugin.editFeature(selectedFeatureIds[0])) {
                  return
                }
                interactiveMap.toggleButtonState('drawTools', 'hidden', true)
                interactPlugin.disable()
              }
            },
            {
              id: 'deleteFeature',
              label: 'Delete feature',
              iconSvgContent: ICON_DELETE,
              isDisabled: true,
              onClick: () => {
                drawPlugin.deleteFeature(selectedFeatureIds)
                interactPlugin.clear()
                interactiveMap.toggleButtonState('drawTools', 'hidden', false)
                interactiveMap.toggleButtonState('drawPolygon', 'disabled', false)
                interactiveMap.toggleButtonState('drawLine', 'disabled', false)
                interactiveMap.toggleButtonState('editFeature', 'disabled', true)
                interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
              }
            }
          ]
        })
      })

      interactiveMap.on('draw:started', () => {
        interactPlugin.disable()
      })

      interactiveMap.on('draw:created', () => {
        interactiveMap.toggleButtonState('drawTools', 'hidden', false)
        interactPlugin.enable()
      })

      interactiveMap.on('draw:edited', () => {
        interactiveMap.toggleButtonState('drawTools', 'hidden', false)
        interactPlugin.enable()
      })

      interactiveMap.on('draw:cancelled', () => {
        interactiveMap.toggleButtonState('drawTools', 'hidden', false)
        interactPlugin.enable()
      })

      interactiveMap.on('interact:selectionchange', (e) => {
        const singleFeature = e.selectedFeatures.length === 1
        const anyFeature = e.selectedFeatures.length > 0
        const isDrawFeature = singleFeature && DRAW_LAYERS.includes(e.selectedFeatures[0].layerId)
        const allDrawFeatures = anyFeature && e.selectedFeatures.every(f => DRAW_LAYERS.includes(f.layerId))
        selectedFeatureIds = e.selectedFeatures.map(f => f.featureId)
        interactiveMap.toggleButtonState('drawPolygon', 'disabled', singleFeature)
        interactiveMap.toggleButtonState('drawLine', 'disabled', singleFeature)
        interactiveMap.toggleButtonState('editFeature', 'disabled', !isDrawFeature)
        interactiveMap.toggleButtonState('deleteFeature', 'disabled', !allDrawFeatures)
      })
    })
  }, [])

  return <div className='app-no-prose app-example'><div id='demo-map-draw'></div></div>
}

export default function DemoMapDrawTools () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
