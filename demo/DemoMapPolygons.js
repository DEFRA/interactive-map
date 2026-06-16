import { useEffect, useRef } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const MAP_STYLE = {
  id: 'outdoor',
  url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
  attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
  backgroundColor: '#f5f5f0'
}

const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    id: 1,
    properties: { name: 'Feature 1', land_use: 'Permanent grassland' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4691585,54.5552164],[-2.4692202,54.5553906],[-2.4690646,54.5554155],[-2.4690002,54.5555088],[-2.4690297,54.5556690],[-2.4690995,54.5557919],[-2.4669269,54.5566971],[-2.4662375,54.5562819],[-2.4637780,54.5574391],[-2.4628580,54.5568169],[-2.4607612,54.5560985],[-2.4608248,54.5560719],[-2.4611789,54.5558914],[-2.4613774,54.5558168],[-2.4615973,54.5557577],[-2.4617475,54.5557297],[-2.4618816,54.5556519],[-2.4620104,54.5556115],[-2.4624771,54.5555275],[-2.4627131,54.5555150],[-2.4628741,54.5554839],[-2.4630082,54.5554404],[-2.4632335,54.5553346],[-2.4633944,54.5552164],[-2.4634749,54.5551106],[-2.4635178,54.5550235],[-2.4635285,54.5548213],[-2.4635768,54.5546346],[-2.4635875,54.5544884],[-2.4636090,54.5544075],[-2.4636465,54.5543515],[-2.4636573,54.5542769],[-2.4636358,54.5541804],[-2.4637377,54.5540155],[-2.4639094,54.5538724],[-2.4643493,54.5535831],[-2.4645370,54.5535084],[-2.4647141,54.5534804],[-2.4648052,54.5534836],[-2.4648213,54.5535116],[-2.4648750,54.5535396],[-2.4650842,54.5535893],[-2.4652451,54.5536516],[-2.4652719,54.5536796],[-2.4653900,54.5537355],[-2.4655455,54.5537853],[-2.4658459,54.5539502],[-2.4663556,54.5542738],[-2.4668008,54.5545164],[-2.4668330,54.5545506],[-2.4668437,54.5546782],[-2.4668598,54.5547031],[-2.4670798,54.5548306],[-2.4671817,54.5549053],[-2.4674177,54.5549364],[-2.4677664,54.5550484],[-2.4681956,54.5551448],[-2.4684101,54.5551759],[-2.4691129,54.5552195],[-2.4691585,54.5552164]]]}
  },{
    type: 'Feature',
    id: 2,
    properties: { name: 'Feature 2', land_use: 'Arable' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4611682,54.5562375],[-2.4628580,54.5568161],[-2.4636841,54.5573753],[-2.4637793,54.5574398],[-2.4641401,54.5576751],[-2.4642567,54.5577999],[-2.4641307,54.5578823],[-2.4636841,54.5582502],[-2.4624221,54.5592884],[-2.4623376,54.5592534],[-2.4615370,54.5586429],[-2.4611869,54.5582852],[-2.4605258,54.5581071],[-2.4598472,54.5578186],[-2.4611682,54.5562375]]]}
  },{
    type: 'Feature',
    id: 3,
    properties: { name: 'Feature 3', land_use: 'Arable' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4598472,54.5578186],[-2.4605258,54.5581067],[-2.4611869,54.5582852],[-2.4615376,54.5586433],[-2.4623108,54.5592332],[-2.4623376,54.5592534],[-2.4624221,54.5592884],[-2.4623108,54.5594120],[-2.4616731,54.5601189],[-2.4586053,54.5601189],[-2.4584410,54.5600299],[-2.4580038,54.5596574],[-2.4581815,54.5593953],[-2.4585778,54.5590702],[-2.4587287,54.5589353],[-2.4589198,54.5586736],[-2.4591116,54.5582136],[-2.4598472,54.5578186]]]}
  },{
    type: 'Feature',
    id: 4,
    properties: { name: 'Feature 4', land_use: 'Permanent grassland' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4633756,54.5612877],[-2.4613908,54.5604315],[-2.4624221,54.5592884],[-2.4641307,54.5578823],[-2.4642567,54.5577999],[-2.4653631,54.5591733],[-2.4659613,54.5597013],[-2.4633756,54.5612877]]]}
  },{
    type: 'Feature',
    id: 5,
    properties: { name: 'Feature 5', land_use: 'Arable' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4678040,54.5590679],[-2.4661879,54.5595952],[-2.4659613,54.5597013],[-2.4653638,54.5591737],[-2.4642567,54.5577999],[-2.4641401,54.5576751],[-2.4637793,54.5574398],[-2.4662369,54.5562822],[-2.4669282,54.5566975],[-2.4678040,54.5563320],[-2.4678040,54.5590679]]]}
  },{
    type: 'Feature',
    id: 6,
    properties: { name: 'Feature 6', land_use: 'Permanent grassland' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4669316,54.5603767],[-2.4676430,54.5613102],[-2.4673292,54.5614556],[-2.4671616,54.5617468],[-2.4658446,54.5625528],[-2.4651546,54.5621528],[-2.4639215,54.5633040],[-2.4633146,54.5633040],[-2.4628372,54.5630921],[-2.4631195,54.5628195],[-2.4643741,54.5618374],[-2.4665071,54.5604793],[-2.4667056,54.5604187],[-2.4669316,54.5603767]]]}
  },{
    type: 'Feature',
    id: 7,
    properties: { name: 'Feature 7', land_use: 'Woodland' },
    geometry: { type: 'Polygon', coordinates: [[[-2.4599129,54.5564203],[-2.4599773,54.5565478],[-2.4599773,54.5565852],[-2.4599344,54.5566256],[-2.4596876,54.5566069],[-2.4594945,54.5566132],[-2.4593657,54.5566505],[-2.4592584,54.5567158],[-2.4592048,54.5567780],[-2.4591780,54.5568496],[-2.4591887,54.5569616],[-2.4591297,54.5570829],[-2.4590009,54.5572726],[-2.4589419,54.5573162],[-2.4588561,54.5574686],[-2.4587435,54.5575588],[-2.4586684,54.5575837],[-2.4585879,54.5575962],[-2.4584001,54.5575837],[-2.4583304,54.5575899],[-2.4580836,54.5576397],[-2.4579817,54.5576895],[-2.4579227,54.5576988],[-2.4578154,54.5576988],[-2.4576384,54.5576739],[-2.4574614,54.5576739],[-2.4573044,54.5577050],[-2.4563093,54.5573092],[-2.4563871,54.5569849],[-2.4564891,54.5560664],[-2.4565601,54.5559039],[-2.4567747,54.5559412],[-2.4571985,54.5559817],[-2.4573219,54.5560097],[-2.4576116,54.5560936],[-2.4582446,54.5562181],[-2.4584913,54.5562959],[-2.4590331,54.5563705],[-2.4599129,54.5564203]]]}
  }]
}

const parcelsDataset = {
  id: 'field-parcels',
  label: 'Field parcels',
  geojson: geojson,
  minZoom: 10,
  maxZoom: 24,
  showInKey: true,
  showInMenu: true,
  sublayers: [{
    id: 'arable',
    label: 'Arable',
    filter: ['==', ['get', 'land_use'], 'Arable'],
    showInMenu: true,
    style: {
      stroke: { outdoor: '#6D4C41', dark: '#ffffff' },
      fillPattern: 'horizontal-hatch',
      fillPatternForegroundColor: { outdoor: '#6D4C41', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent'
    }
  },{
    id: 'permanent-grassland',
    label: 'Permanent grassland',
    filter: ['==', ['get', 'land_use'], 'Permanent grassland'],
    showInMenu: true,
    style: {
      stroke: { outdoor: '#00897B', dark: '#ffffff' },
      fillPattern: 'diagonal-cross-hatch',
      fillPatternForegroundColor: { outdoor: '#00897B', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent'
    }
  },{
    id: 'woodland',
    label: 'Woodland',
    filter: ['==', ['get', 'land_use'], 'Woodland'],
    showInMenu: true,
    style: {
      stroke: { outdoor: '#2E7D32', dark: '#ffffff' },
      fillPattern: 'dot',
      fillPatternForegroundColor: { outdoor: '#2E7D32', dark: '#ffffff' },
      fillPatternBackgroundColor: 'transparent'
    }
  }]
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
      import('../plugins/beta/datasets/src/index.js'),
      import('../plugins/beta/draw-ml/src/index.js'),
      import('../plugins/interact/src/index.js')
    ]).then(([
      { default: InteractiveMap },
      { default: maplibreProvider },
      { default: createDatasetsPlugin },
      { default: createDrawPlugin },
      { default: createInteractPlugin }
    ]) => {
      const datasetsPlugin = createDatasetsPlugin({
        datasets: [parcelsDataset]
      })

      const drawPlugin = createDrawPlugin({
        snapLayers: ['stroke-inactive.cold', 'field-parcels', 'surfacewater shadow']
      })

      const interactPlugin = createInteractPlugin({
        layers: [
          { layerId: 'fill-inactive.cold' },
          { layerId: 'stroke-inactive.cold' },
          { layerId: 'field-parcels-arable' },
          { layerId: 'field-parcels-permanent-grassland' },
          { layerId: 'field-parcels-woodland' }
        ],
        interactionModes: ['selectFeature'],
        multiSelect: false,
        deselectOnClickOutside: true,
        debug: true
      })

      const map = new InteractiveMap('demo-map-polygons', {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: MAP_STYLE,
        center: [-2.464, 54.558],
        zoom: 14,
        containerHeight: '516px',
        plugins: [datasetsPlugin, drawPlugin, interactPlugin]
      })

      let selectedFeatures = []
      let editingDrawFeatureId = null
      let editingParcelFeatureId = null


      map.on('map:ready', function () {
        interactPlugin.enable()
        map.addButton('drawActions', {
          label: 'Draw tools',
          mobile: { slot: 'bottom-right', order: 1 },
          tablet: { slot: 'top-middle', order: 1 },
          desktop: { slot: 'top-middle', order: 1 },
          menuItems: [{
            id: 'drawPolygon',
            label: 'Draw polygon',
            iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
            onClick: function () {
              map.toggleButtonState('drawActions', 'hidden', true)
              drawPlugin.newPolygon(crypto.randomUUID())
            }
          },{
            id: 'editFeature',
            label: 'Edit feature',
            iconSvgContent: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
            isDisabled: true,
            onClick: function () {
              const selected = selectedFeatures[0]
              const drawLayers = ['fill-inactive.cold', 'stroke-inactive.cold']
              let featureIdToEdit = selected.featureId
              if (!drawLayers.includes(selected.layerId)) {
                const parcelFeature = geojson.features.find(function (f) { return f.id === selected.featureId })
                if (!parcelFeature) {
                  return
                }
                editingDrawFeatureId = crypto.randomUUID()
                drawPlugin.addFeature({ ...parcelFeature, id: editingDrawFeatureId })
                datasetsPlugin.setFeatureVisibility(false, [selected.featureId], { datasetId: 'field-parcels' })
                editingParcelFeatureId = selected.featureId
                featureIdToEdit = editingDrawFeatureId
              }
              if (!drawPlugin.editFeature(featureIdToEdit)) {
                return
              }
              map.toggleButtonState('drawActions', 'hidden', true)
              interactPlugin.disable()
            }
          },{
            id: 'deleteFeature',
            label: 'Delete feature',
            iconSvgContent: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
            isDisabled: true,
            onClick: function () {
              drawPlugin.deleteFeature(selectedFeatures.map(function (f) { return f.featureId }))
              interactPlugin.clear()
              map.toggleButtonState('editFeature', 'disabled', true)
              map.toggleButtonState('deleteFeature', 'disabled', true)
            }
          }]
        })
      })

      map.on('interact:selectionchange', function (e) {
        const drawLayers = ['fill-inactive.cold', 'stroke-inactive.cold']
        const single = e.selectedFeatures.length === 1
        const parcelLayers = ['field-parcels-arable', 'field-parcels-permanent-grassland', 'field-parcels-woodland']
        const isEditableFeature = single && (
          drawLayers.includes(e.selectedFeatures[0].layerId) ||
          parcelLayers.includes(e.selectedFeatures[0].layerId)
        )
        const isDrawFeature = single && drawLayers.includes(e.selectedFeatures[0].layerId)
        selectedFeatures = e.selectedFeatures
        map.toggleButtonState('editFeature', 'disabled', !isEditableFeature)
        map.toggleButtonState('deleteFeature', 'disabled', !isDrawFeature)
      })

      map.on('draw:started', function () {
        interactPlugin.disable()
      })

      map.on('draw:created', function () {
        map.toggleButtonState('drawActions', 'hidden', false)
        interactPlugin.enable()
      })

      map.on('draw:edited', function (e) {
        console.log(e)
        if (editingParcelFeatureId !== null) {
          datasetsPlugin.setFeatureVisibility(true, [editingParcelFeatureId], { datasetId: 'field-parcels' })
          editingParcelFeatureId = null
          editingDrawFeatureId = null
        }
        map.toggleButtonState('drawActions', 'hidden', false)
        interactPlugin.enable()
      })

      map.on('draw:cancelled', function () {
        if (editingParcelFeatureId !== null) {
          datasetsPlugin.setFeatureVisibility(true, [editingParcelFeatureId], { datasetId: 'field-parcels' })
          editingParcelFeatureId = null
          editingDrawFeatureId = null
        }
        map.toggleButtonState('drawActions', 'hidden', false)
        interactPlugin.enable()
      })

    })
  }, [])

  return <div id='demo-map-polygons' className='app-no-prose app-example'></div>
}

export default function DemoMapPolygons () {
  return (
    <BrowserOnly
      fallback={<div className='govuk-inset-text'>The map requires JavaScript to be enabled.</div>}
    >
      {() => <MapInner />}
    </BrowserOnly>
  )
}
