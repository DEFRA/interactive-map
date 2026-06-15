import InteractiveMap from '../../src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/beta/datasets/src/index.js'
// Setup
import { vtsMapStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest3857, setupEsriConfig } from './auth.js'

const datasets = [
  {
    id: 'flood-zones',
    label: 'Flood Zones',
    groupLabel: 'Datasets',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_NON_PRODUCTION/VectorTileServer`,
    showInKey: true,
    showInMenu: true,
    sublayers: [
      {
        id: 'flood-zone-2',
        label: 'Flood Zone 2',
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 2/1',
        showInKey: true,
        showInMenu: false,
        style: {
          fill: { outdoor: '#1d70b8', dark: '#7fcdbb' },
          stroke: 'none'
        },
      },
      {
        id: 'flood-zone-3',
        label: 'Flood Zone 3',
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 3/1',
        showInKey: true,
        showInMenu: false,
        style: {
          fill: { outdoor: '#003078', dark: '#e5f5e0' },
          stroke: 'none'
        },
      }
    ]
  }
]

const datasetsPlugin = createDatasetsPlugin({
  globals: {
    opacityMode: 'global', // 'dataset', 'global' or 'multiply'
    opacity: 0.75,
    visible: true
  },
  datasets
})



const interactiveMap = new InteractiveMap('map', {
  behaviour: 'mapOnly',
  mapProvider: esriProvider({ setupConfig: setupEsriConfig }),
  minZoom: 6,
  maxZoom: 20,
  autoColorScheme: true,
  center: [481146,484971],
  zoom: 13,
  plugins: [
    datasetsPlugin,
    mapStylesPlugin({
      mapStyles: vtsMapStyles27700,
      manifest: {
        buttons: [{
          id: 'mapStyles',
          desktop: { slot: 'right-top', showLabel: true }
        }],
        panels: [
          { 
            id: 'mapStyles', 
            desktop: { slot: 'map-styles-button', width: '400px', modal: true }
          }
        ]
      }
    })
  ]
})