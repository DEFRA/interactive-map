import InteractiveMap from '../../src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/src/index.js'
import createMapKeyPlugin from '/plugins/map-key/src/index.js'
import createMenuPlugin from '/plugins/menu/src/index.js'
// Setup
import { vtsMapStyles27700 } from './mapStyles.js'
import { drawPlugin, framePlugin, attachDrawPlugin } from './planning/drawPlugin.js'
import { transformGeocodeRequest, transformVtsRequest3857, setupEsriConfig } from './auth.js'

const nonFloodZoneLight = '#2b8cbe'
const nonFloodZoneDark = '#7fcdbb'
const white = '#ffffff'
const darkTeal = '#12393d'

const COLOURS = {
  // floodExtents: { default: nonFloodZoneLight, dark: nonFloodZoneDark },

  depthOver2300: { default: '#7f2704', dark: '#238b45' },
  depth2300: { default: '#a63603', dark: '#41ab5d' },
  depth1200: { default: '#d94801', dark: '#74c476' },
  depth900: { default: '#f16913', dark: '#a1d99b' },
  depth600: { default: '#fd8d3c', dark: '#c7e9c0' },
  depth300: { default: '#fdae6b', dark: '#e5f5e0' },
  depth150: { default: '#fdd0a2', dark: '#f7fcf5' },

  floodZone3: { default: '#003078', dark: '#e5f5e0' },
  floodZone2: { default: '#1d70b8', dark: '#41ab5d' },
  floodZoneClimateChange: { default: '#F4A582', dark: '#BF3D4A' },
  // floodZoneClimateChangeNoData: { default: darkTeal, dark: white },

  floodDefences: { default: '#f47738', dark: '#f47738' },
  // waterStorageAreas: { default: darkTeal, dark: white },
  // mainRivers: { default: darkTeal, dark: white }
}

// light tones > 2300 to < 150
const nonFloodZoneDepthBandsLight = [COLOURS.depthOver2300.default, COLOURS.depth2300.default, COLOURS.depth1200.default, COLOURS.depth900.default, COLOURS.depth600.default, COLOURS.depth300.default, COLOURS.depth150.default]
// GREENS dark tones > 2300 to < 150
const nonFloodZoneDepthBandsDark = [COLOURS.depthOver2300.dark, COLOURS.depth2300.dark, COLOURS.depth1200.dark, COLOURS.depth900.dark, COLOURS.depth600.dark, COLOURS.depth300.dark, COLOURS.depth150.dark]

const datasetFloodZonesCC =   {
  id: 'floodzonescc',
  label: 'Flood zones',
  groupLabel: 'Flood zones',
  esriGroupId: 'floodzones-group',
  tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_CCP1_NON_PRODUCTION/VectorTileServer`,
  showInKey: true,
  visible: true,
  sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea CCP1',
  visibleWhen: { menu: { dataset: ['floodzones'] } },
  sublayers: [
    {
      id: 'climate-change',
      label: 'Climate change (2070 to 2125)',
      esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Flood Zones plus climate change/1',
      showInKey: true,
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
    }
  ]
}

const datasetFloodZones = {
  id: 'floodzones',
  label: 'Flood Zones',
  groupLabel: 'Flood zones',
  esriGroupId: 'floodzones-group',
  tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_NON_PRODUCTION/VectorTileServer`,
  showInKey: true,
  sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea',
  visibleWhen: {
    menu: { dataset: ['floodzones'] }
  },
  sublayers: [
    {
      id: 'flood-zone-2',
      label: 'Flood Zone 2',
      esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 2/1',
      style: {
        fill: { outdoor: '#1d70b8', dark: '#7fcdbb' },
        stroke: 'none'
      },
    },
    {
      id: 'flood-zone-3',
      label: 'Flood Zone 3',
      esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 3/1',
      style: {
        fill: { outdoor: '#003078', dark: '#e5f5e0' },
        stroke: 'none'
      },
    }
  ]
}

let depthsKey = null
const extentsStyle = { 
  fill: { outdoor: nonFloodZoneLight, dark: nonFloodZoneDark }, 
  stroke: { outdoor: nonFloodZoneLight, dark: nonFloodZoneDark }, 
}

const surfaceWaterDatasetGenerator = ({id, tileName, sourceLayer, timeframe, aep}) => {
  const visibleWhenMenu = { dataset: ['surfacewater'], timeframe, aep }

  const extentsDataset = {
    id: `${id}-extents`,
    label: 'Surface Water',
    groupLabel: 'Surface Water',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/${tileName}/VectorTileServer`,
    showInKey: true,
    sourceLayer,
    style: extentsStyle,
    visibleWhen: { menu: visibleWhenMenu },
    sublayers: [
      {
        id: 'depthOver2300',
        esriStyleLayerId: `${sourceLayer}/>2300mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200', 'depth2300', 'depthOver2300'] } },

      },
      {
        id: 'depth2300',
        esriStyleLayerId: `${sourceLayer}/1200-2300mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200', 'depth2300'] } },
      },
      {
        id: 'depth1200',
        esriStyleLayerId: `${sourceLayer}/900-1200mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200'] } },
      },
      {
        id: 'depth900',
        esriStyleLayerId: `${sourceLayer}/600-900mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300', 'depth600', 'depth900'] } },
      },
      {
        id: 'depth600',
        esriStyleLayerId: `${sourceLayer}/300-600mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300', 'depth600'] } },
      },
      {
        id: 'depth300',
        esriStyleLayerId: `${sourceLayer}/150-300mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150', 'depth300'] } },
      },
      {
        id: 'depth150',
        esriStyleLayerId: `${sourceLayer}/<150mm/1`,
        showInKey: false,
        style: extentsStyle,
        visibleWhen: { menu: {...visibleWhenMenu, depth: ['depth150'] } },
      },
    ]
  }

  const depthDataset = {
    id: `${id}-depths`,
    label: 'Surface Water Depth All',
    groupLabel: 'Surface Water',
    tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/${tileName}/VectorTileServer`,
    showInKey: false,
    sourceLayer,
    visibleWhen: { menu: {...visibleWhenMenu, depth: ['depthAll'] } },
    sublayers: [
      {
        id: 'depthOver2300',
        esriStyleLayerId: `${sourceLayer}/>2300mm/1`,
        label: 'Extent over 2300mm X',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[0], dark: nonFloodZoneDepthBandsDark[0] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[0], dark: nonFloodZoneDepthBandsDark[0] },
        }
      },
      {
        id: 'depth2300',
        esriStyleLayerId: `${sourceLayer}/1200-2300mm/1`,
        label: 'Extent over 1200mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[1], dark: nonFloodZoneDepthBandsDark[1] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[1], dark: nonFloodZoneDepthBandsDark[1] },
        }
      },
      {
        id: 'depth1200',
        esriStyleLayerId: `${sourceLayer}/900-1200mm/1`,
        label: 'Extent over 900mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[2], dark: nonFloodZoneDepthBandsDark[2] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[2], dark: nonFloodZoneDepthBandsDark[2] },
        }
      },
      {
        id: 'depth900',
        esriStyleLayerId: `${sourceLayer}/600-900mm/1`,
        label: 'Extent over 600mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[3], dark: nonFloodZoneDepthBandsDark[3] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[3], dark: nonFloodZoneDepthBandsDark[3] },
        }
      },
      {
        id: 'depth600',
        esriStyleLayerId: `${sourceLayer}/300-600mm/1`,
        label: 'Extent over 300mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[4], dark: nonFloodZoneDepthBandsDark[4] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[4], dark: nonFloodZoneDepthBandsDark[4] },
        }
      },
      {
        id: 'depth300',
        esriStyleLayerId: `${sourceLayer}/150-300mm/1`,
        label: 'Extent over 150mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[5], dark: nonFloodZoneDepthBandsDark[5] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[5], dark: nonFloodZoneDepthBandsDark[5] },
        }
      },
      {
        id: 'depth150',
        esriStyleLayerId: `${sourceLayer}/<150mm/1`,
        label: 'Extent up to 150mm',
        style: {
          fill: { outdoor: nonFloodZoneDepthBandsLight[6], dark: nonFloodZoneDepthBandsDark[6] },
          stroke: { outdoor: nonFloodZoneDepthBandsLight[6], dark: nonFloodZoneDepthBandsDark[6] },
        }
      },
    ]
  }
  if (depthsKey) {
    return [extentsDataset, depthDataset]
  }
  // We only really need one of these with visibleWhen: { menu: {dataset: ['surfacewater'], depth: ['depthAll'] } },
  depthsKey = {
    id: `depths-key`,
    label: 'Surface water',
    groupLabel: 'Surface water depth in millimetres',
    groupStyle: 'ramp',
    showInKey: true,
    visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depthAll'] } },
    sublayers: depthDataset.sublayers.map((sublayer) => {
      return {
        ...sublayer,
        esriStyleLayerId: null,
        label: sublayer.label.match(/[0-9]+/)[0],
      }
    })
  }
  const extraDepthKeys = []
  for(let i = 3; i <= depthsKey.sublayers.length; i++) {
    extraDepthKeys.push({
      ...depthsKey, 
      groupLabel: `${depthsKey.groupLabel} [${i}]`,
      id: `${depthsKey.id}-${i}`,
      sublayers: depthsKey.sublayers.slice(0, i).map((sublayer) => ({ ...sublayer, label: `${i}.${sublayer.label}`.replaceAll('0', '') })),
    })
  }
  // return [depthsKey, extentsDataset, depthDataset]
  return [...extraDepthKeys, extentsDataset, depthDataset]
}

const surfaceWaterExtentsKey = {
  id: 'surfacewater-extents-key',
  label: 'Surface Water',
  groupLabel: 'Surface Water',
  showInKey: true,
  style: extentsStyle,
  sublayers: [
    {
      id: 'key-150',
      label: 'Full extend of flooding',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth150'] } }
    },
    {
      id: 'key-300',
      label: 'Extent over 150mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth300'] } }
    },
    {
      id: 'key-600',
      label: 'Extent over 300mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth600'] } }
    },
    {
      id: 'key-900',
      label: 'Extent over 600mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth900'] } }
    },
    {
      id: 'key-1200',
      label: 'Extent over 900mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth1200'] } }
    },
    {
      id: 'key-2300',
      label: 'Extent over 1200mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth2300'] } }
    },
    {
      id: 'key-over-2300',
      label: 'Extent over 2300mm',
      showInKey: true,
      style: extentsStyle,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depthOver2300'] } }
    }
  ]
}

const datasetMainRivers = {
  id: 'mainrivers',
  label: 'Main Rivers',
  groupLabel: 'Map features',
  type: 'FeatureService',
  tiles: 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Statutory_Main_River_Map/FeatureServer',
  showInKey: true,
  sourceLayer: 'Statutory_Main_River_Map',
  visible: false,
  style: {
    renderer: {
      type: 'simple',
      symbol: {
        type: 'simple-line',
        width: '3px',
        color: { outdoor: darkTeal, dark: white },
      }
    },
    stroke: { outdoor: darkTeal, dark: white },
    fill: 'transparent',
    symbolDescription: { outdoor: 'dark teal line', dark: 'white line' },
    keySymbolShape: 'line',
    strokeWidth: 3
  }
}

const datasetWaterStorageAreas = {
  id: 'waterstorage',
  label: 'Water Storage',
  groupLabel: 'Map features',
  type: 'FeatureService',
  tiles: 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Storage_Areas_NON_PRODUCTION/FeatureServer',
  showInKey: true,
  sourceLayer: 'Flood_Storage_Areas',
  visible: false,
  style: {
    renderer: {
      type: 'simple',
      symbol: {
        type: 'simple-fill',
        style: 'diagonal-cross',
        color: { outdoor: darkTeal, dark: white },
        outline: { 
          color: { outdoor: darkTeal, dark: white }, 
          width: 1 
        }
      }
    },
    stroke: { outdoor: darkTeal, dark: white },
    strokeWidth: 1,
    fillPattern: 'diagonal-cross-hatch',
    fillPatternForegroundColor: { outdoor: darkTeal, dark: white },
    fillPatternBackgroundColor: 'transparent'
  }
}

const datasetFloodDefences = {
  id: 'flooddefence',
  label: 'Flood Defence',
  groupLabel: 'Map features',
  type: 'FeatureService',
  tiles: 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Defences_NON_PRODUCTION/FeatureServer',
  showInKey: true,
  sourceLayer: 'Defences',
  visible: false,
  style: {
    renderer: {
      type: 'simple',
      symbol: {
        type: 'simple-line',
        width: '3px',
        color: '#f47738',
      }
    },
    stroke: '#f47738',
    fill: 'transparent',
    symbolDescription: 'orange line',
    keySymbolShape: 'line',
    strokeWidth: 3
  }
}

const datasets = [
  datasetFloodZonesCC,
  datasetFloodZones,
  surfaceWaterExtentsKey,
  // Surface Water Present Day
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-presentday-low',
    tileName: 'Surface_Water_Spatial_Planning_1_in_1000_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 1000 Depths',
    timeframe: ['presentday'],
    aep: ['low'],
  }),
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-presentday-medium',
    tileName: 'Surface_Water_Spatial_Planning_1_in_100_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 100 Depths',
    timeframe: ['presentday'],
    aep: ['medium'],
  }),
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-presentday-high',
    tileName: 'Surface_Water_Spatial_Planning_1_in_30_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 30 Depths',
    timeframe: ['presentday'],
    aep: ['high'],
  }),
  // Surface Water Climate Change
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-climatechange-low',
    tileName: 'Surface_Water_Spatial_Planning_1_in_1000_CCP1_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 1000 CCP1 Depths',
    timeframe: ['climatechange'],
    aep: ['low'],
  }),
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-climatechange-medium',
    tileName: 'Surface_Water_Spatial_Planning_1_in_100_CCP1_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 100 CCP1 Depths',
    timeframe: ['climatechange'],
    aep: ['medium'],
  }),
  ...surfaceWaterDatasetGenerator({
    id: 'surfacewater-climatechange-high',
    tileName: 'Surface_Water_Spatial_Planning_1_in_30_CCP1_Depths_NON_PRODUCTION',
    sourceLayer: 'Surface Water Spatial Planning 1 in 30 CCP1 Depths',
    timeframe: ['climatechange'],
    aep: ['high'],
  }),

  datasetWaterStorageAreas, datasetFloodDefences, datasetMainRivers
]

const getCheckboxOnChangeHandler = (datasetId) => (checked) => datasetsPlugin.setDatasetVisibility(checked, { datasetId })

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
    visibleWhen: { menu: { dataset: ['floodzones', 'surfacewater'] } },
    value: 'presentday',
    items: [
      { id: 'presentday', label: 'Present day' },
      { id: 'climatechange', label: '2070 to 2125', visibleWhen: { menu: { dataset: ['floodzones'] } } },
      { id: 'climatechange', label: '2061 to 2125', visibleWhen: { menu: { dataset: ['surfacewater'] } } },
    ]
  }, {
    id: 'aep',
    label: 'Annual likelihood of flooding',
    urlKey: 'dataset',
    urlIndex: 2,
    type: 'radio',
    visibleWhen: { menu: { dataset: ['surfacewater'] } },
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
    visibleWhen: { menu: { dataset: ['surfacewater'] } },
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
    groupLabel: 'Map features',
    urlKey: 'features',
    type: 'checkbox',
    visibleWhen: true,
    items: [
      { id: 'waterstorage', label: 'Water storage', handleOnChange: getCheckboxOnChangeHandler('waterstorage') },
      { id: 'flooddefence', label: 'Flood defence', handleOnChange: getCheckboxOnChangeHandler('flooddefence') },
      { id: 'mainrivers', label: 'Main rivers', handleOnChange: getCheckboxOnChangeHandler('mainrivers') },
    ]
  }
]

const datasetsPlugin = createDatasetsPlugin({
  globals: {
    opacityMode: 'global', // 'dataset', 'global' or 'multiply'
    opacity: 0.75,
    visible: true
  },
  hasMenu: false,
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
    drawPlugin,
    framePlugin,
    createMapKeyPlugin({
      manifest: {
        panels: [{
          id: 'mapKey',
          mobile: { slot: 'drawer', modal: false },
          tablet: { slot: 'left-top', width: '360px' },
          desktop: { slot: 'left-top', width: '360px' },
        }]
      },
    }),
    createMenuPlugin({
      manifest: {
        panels: [{
          id: 'menu',
          desktop: { open: true, slot: 'side', width: '280px', dismissible: false, exclusive: false, },
          tablet: { slot: 'side', width: '280px', modal: true }
        }],
        buttons: [
          {
            id: 'menuButton',
            excludeWhen: ({ appState }) => (appState?.breakpoint === 'desktop'),
          }
        ]
      },
      menu
    }),
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

const onEditPolygon = (isEditing) => {
    // toggleKeyWhenEditing(isEditing)
    if (isEditing) {
      // interactiveMap.removePanel(interactPlugin.panelId)
      interactiveMap.removeMarker('search')
      interactiveMap.hidePanel('menu')
      // Disable the selectAtTarget (infoPanel) button
      interactiveMap.toggleButtonState('selectAtTarget', 'disabled', true)
      if (datasetsPlugin.ready) { // hide layers
        datasetsPlugin.setDatasetVisibility(false)
      }
    } else {
      interactiveMap.showPanel('menu')
      if (datasetsPlugin.ready) {
        datasetsPlugin.setDatasetVisibility(true)
      }
      // interactPlugin.triggerHitTest()
    }
  }
attachDrawPlugin(interactiveMap, onEditPolygon)

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
  updateVisibleLayers()
  initPointerMove(mapState.view)
  datasetsPlugin.ready = true
})

const mapState = {}

interactiveMap.on('map:ready', function ({ map, view, mapStyleId, mapSize, crs }) {
  // console.log('map:ready', { map, view, mapStyleId, mapSize, crs })
  mapState.map = map
  mapState.view = view
})

let visibleLayers = null

const updateVisibleLayers = () => {
  // Ensure the visibleLayers array is updated whenever the user hovers over the map,
  // so that we can use them in the hitTest to determine which layers to test against.
  visibleLayers = mapState.map.allLayers.items.filter((item) => item.type === 'vector-tile' && item.visible === true && item.id !== 'baselayer')
}

const initPointerMove = (view) => {
  let lastHit = 0
  const throttleMs = 20 // Throttle to reduce hitTest usage
  const minScale = 250000 // vector tile layers use minScale value from arcgis online config for visibility

  view.on('pointer-enter', updateVisibleLayers)
  view.on('pointer-move', e => {
    const now = Date.now()
    if (!visibleLayers || now - lastHit < throttleMs || view.scale > minScale) {
      return
    }
    lastHit = now
    const layersToTest = visibleLayers
    view.hitTest(e, { include: layersToTest, pixelRadius: 0, tolerance: 0 }).then((response) => {
      let topVisibleStyleLayerId = null
      if (response?.results?.length > 0) {
        // const { layerId } = response?.results?.[0]?.graphic?.origin || {}
        const visibleStyleLayerIds = response?.results.reduce((layerIds, result) => {
          const { layerId } = result.graphic?.origin || {}
          if (!layerId) {
            return layerIds
          }
          const vtLayer = result.layer
          const styleLayer = vtLayer?.getStyleLayer(layerId)
          if (styleLayer?.layout?.visibility === 'visible') {
            layerIds.push(layerId)
          }
          return layerIds
        }, [])
        topVisibleStyleLayerId = visibleStyleLayerIds?.[0] || null
      }
      if (mapState.cursorStyleLayer !== topVisibleStyleLayerId) {
        mapState.cursorStyleLayer = topVisibleStyleLayerId
      }
      document.body.style.cursor = topVisibleStyleLayerId ? 'pointer' : 'default'
    })
  })

  view.on('pointer-leave', _e => {
    document.body.style.cursor = 'default'
    visibleLayers = null
  })
}