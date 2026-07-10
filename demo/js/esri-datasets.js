import InteractiveMap from '../../src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/beta/datasets/src/index.js'
// Setup
import { vtsMapStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest3857, setupEsriConfig } from './auth.js'

const datasetFloodZonesCC =   {
    id: 'floodzonescc',
    label: 'Flood Zones Climate Change',
    groupLabel: 'Datasets',
    esriGroupId: 'floodzones-group',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_CCP1_NON_PRODUCTION/VectorTileServer`,
    showInKey: true,
    showInMenu: true,
    visible: true,
    sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea CCP1',
    sublayers: [
      {
        id: 'climate-change',
        label: 'Climate change (2070 to 2125)',
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Flood Zones plus climate change/1',
        showInKey: true,
        showInMenu: false,
        visibleWhen: {
          menu: {
            dataset: ['floodzones'], timeframe: ['climatechange']
          }
        },
        style: {
          fill: { outdoor: '#F4A582', dark: '#BF3D4A' },
          stroke: 'none'
        },
      },
      {
        id: 'data-unavailable',
        label: 'Climate change data unavailable',
        showInKey: true,
        showInMenu: false,
        visibleWhen: {
          menu: {
            dataset: ['floodzones'], timeframe: ['climatechange']
          }
        },
        style: { // This is used just for the key - so that it renders the pattern correctly.
          fillPattern: 'dot',
          fillPatternForegroundColor: { outdoor: '#000000', dark: '#ffffff' },
          stroke: { outdoor: '#000000', dark: '#FFFFFF' },
        }
      },
      {
        id: 'data-unavailable-outline',
        showInKey: false,
        showInMenu: false,
        visibleWhen: {
          menu: { dataset: ['floodzones'], timeframe: ['climatechange'] }
        },
        style: {
          stroke: { outdoor: '#000000', dark: '#FFFFFF' },
        },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/0'
      },
      {
        id: 'data-unavailable-light',
        visibleWhen: {
          mapStyleId: ['outdoor', 'black-and-white'],
          menu: { dataset: ['floodzones'], timeframe: ['climatechange'] }
        },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/1',
        esriUseServerStyle: true,
        showInKey: false,
        showInMenu: false,
      },
      {
        id: 'data-unavailable-dark',
        visibleWhen: {
          menu: { dataset: ['floodzones'], timeframe: ['climatechange'] },
          mapStyleId: ['dark']
        },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/2',
        esriUseServerStyle: true,
        showInKey: false,
        showInMenu: false,
      }
    ]
  }

  const datasetFloodZones = {
    id: 'floodzones',
    label: 'Flood Zones',
    groupLabel: 'Datasets',
    esriGroupId: 'floodzones-group',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_NON_PRODUCTION/VectorTileServer`,
    showInKey: true,
    // showInMenu: true,
    sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea',
    visibleWhen: {
      menu: { dataset: ['floodzones'] }
    },
    sublayers: [
      {
        id: 'flood-zone-2',
        label: 'Flood Zone 2',
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 2/1',
        showInMenu: true,
        style: {
          fill: { outdoor: '#1d70b8', dark: '#7fcdbb' },
          stroke: 'none'
        },
      },
      {
        id: 'flood-zone-3',
        label: 'Flood Zone 3',
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 3/1',
        showInMenu: true,
        style: {
          fill: { outdoor: '#003078', dark: '#e5f5e0' },
          stroke: 'none'
        },
      }
    ]
  }

const datasets = [
  datasetFloodZonesCC,  datasetFloodZones
]

const menu = [
  {
    id: 'dataset',
    label: 'Datasets',
    urlKey: 'dataset',
    visibleWhen: true,
    type: 'radio', // 'checkbox' or 'radio'
    value: 'floodzones', // this is the default value for the menu, it should be one of the items' id
    items: [
      { id: 'floodzones', label: 'Flood zones' },
      { id: 'surfacewater', label: 'Surface water' },
      { id: 'none', label: 'None', },
    ],
  },
  {
    id: 'timeframe',
    label: 'Timeframe',
    urlKey: 'dataset',
    urlIndex: 1, // eg: surfacewater-presentday-high-depth or floodzones-climatechange
    type: 'radio',
    visibleWhen: { dataset: ['floodzones', 'surfacewater'] },
    value: 'presentday',
    items: [
      { id: 'presentday', label: 'Present day' },
      { id: 'climatechange', label: '2070 to 2125', visibleWhen: { dataset: ['floodzones'] } },
      { id: 'climatechange', label: '2061 to 2125', visibleWhen: { dataset: ['surfacewater'] } },
    ]
  }, {
    id: 'aep',
    label: 'Annual likelihood of flooding',
    urlKey: 'dataset',
    urlIndex: 2,
    type: 'radio',
    visibleWhen: { dataset: ['surfacewater'] },
    value: 'medium',
    items: [
      { id: 'high', label: '1 in 30' },
      { id: 'medium', label: '1 in 100' },
      { id: 'low', label: '1 in 1000' },
    ]
  }, {
    id: 'depth',
    label: 'Depth',
    urlKey: 'dataset',
    urlIndex: 3,
    type: 'radio',
    visibleWhen: { dataset: ['surfacewater'] },
    subMenu: true,
    value: 'depthAll',
    items: [
      { id: 'depthAll', label: 'All depths', },
      { id: 'depth150', label: 'Full extent of flooding', },
      { id: 'depth300', label: 'Extent over 150mm', },
      { id: 'depth600', label: 'Extent over 300mm', },
      { id: 'depth900', label: 'Extent over 600mm', },
      { id: 'depth1200', label: 'Extent over 900mm', },
      { id: 'depth2300', label: 'Extent over 1200mm', },
      { id: 'depthOver2300', label: 'Extent over 2300mm', },
    ]
  }, {
    id: 'features',
    label: 'Map features',
    urlKey: 'features',
    type: 'checkbox',
    visibleWhen: true,
    items: [
      { id: 'water-storage', label: 'Water storage', checked: false },
      { id: 'flood-defence', label: 'Flood defence', checked: false },
      { id: 'main-rivers', label: 'Main rivers', checked: false },
    ]
  }
]

const datasetsPlugin = createDatasetsPlugin({
  globals: {
    opacityMode: 'global', // 'dataset', 'global' or 'multiply'
    opacity: 0.75,
    visible: true
  },
  datasets,
  menu
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

const testGlobalVisibility = () => {
  setTimeout(() => datasetsPlugin.setDatasetVisibility(false), 3000)
  setTimeout(() => datasetsPlugin.setDatasetVisibility(true), 6000)
}

const testAddRemoveDataset = () => {
  setTimeout(() => datasetsPlugin.removeDataset('floodzonescc'), 1000)
  setTimeout(() => datasetsPlugin.removeDataset('floodzones'), 3000)
  setTimeout(() => datasetsPlugin.addDataset(datasetFloodZones), 5000)
}

interactiveMap.on('datasets:ready', function () {
  // testGlobalVisibility()
  // testAddRemoveDataset()
})