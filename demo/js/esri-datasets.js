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
    id: 'flood-zones-cc',
    label: 'Flood Zones Climate Change',
    groupLabel: 'Datasets',
    groupId: 'flood-zones',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_CCP1_NON_PRODUCTION/VectorTileServer`,
    showInKey: true,
    showInMenu: true,
    removeStyles: true,
    visible: true,
    sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea CCP1',
    sublayers: [
      {
        id: 'climate-change',
        label: 'Climate change (2070 to 2125)',
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Flood Zones plus climate change/1',
        showInKey: true,
        showInMenu: false,
        style: {
          fill: { outdoor: '#F4A582', dark: '#BF3D4A' },
          stroke: 'none'
        },
      },
      {
        id: 'data-unavailable',
        label: 'Climate change data unavailable',
        style: { // This is used just for the key - so that it renders the pattern correctly. 
          fillPattern: 'dot',
          fillPatternForegroundColor: { outdoor: '#000000', dark: '#ffffff' },
          stroke: { outdoor: '#000000', dark: '#FFFFFF' },
        },
        showInKey: true,
        showInMenu: false,
      },
      {
        id: 'data-unavailable-outline',
        style: {
          stroke: { outdoor: '#000000', dark: '#FFFFFF' },
        },
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/0',
        showInKey: false,
        showInMenu: false,
      },
      {
        id: 'data-unavailable-light',
        visibleWhen: { mapStyleId: ['outdoor', 'black-and-white'] },
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/1',
        showInKey: false,
        showInMenu: false,
      },
      {
        id: 'data-unavailable-dark',
        visibleWhen: { mapStyleId: ['dark'] },
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/2',
        showInKey: false,
        showInMenu: false,
      }
    ]
  },
  {
    id: 'flood-zones',
    label: 'Flood Zones',
    groupLabel: 'Datasets',
    groupId: 'flood-zones',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_NON_PRODUCTION/VectorTileServer`,
    showInKey: true,
    showInMenu: true,
    sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea',
    sublayers: [
      {
        id: 'flood-zone-2',
        label: 'Flood Zone 2',
        styleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 2/1',
        showInKey: true,
        showInMenu: false,
        style: {
          // filter: ['==', 'flood_zone', 'FZ2'],
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
          // filter: ['==', 'flood_zone', 'FZ3'],
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