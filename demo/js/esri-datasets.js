import InteractiveMap from '../../src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/datasets/src/index.js'
// Setup
import { vtsMapStyles27700 } from './mapStyles.js'
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

const surfaceWaterDataset = {
  id: 'surfacewater',
  label: 'Surface Water',
  groupLabel: 'Datasets',
  tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Surface_Water_Spatial_Planning_1_in_1000_Depths_NON_PRODUCTION/VectorTileServer`,
  showInKey: true,
  sourceLayer: 'Surface Water Spatial Planning 1 in 1000 Depths',
  style: {
    fill: { outdoor: nonFloodZoneLight, dark: nonFloodZoneDark },
  },
  visibleWhen: {
    menu: {
      dataset: ['surfacewater'],
      timeframe: ['presentday'],
      aep: ['low'],
    }
  },
  sublayers: [
    {
      id: 'depthOver2300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/>2300mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200', 'depth2300', 'depthOver2300']
        }
      }
    },
    {
      id: 'depth2300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/1200-2300mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200', 'depth2300']
        }
      }
    },
    {
      id: 'depth1200',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/900-1200mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300', 'depth600', 'depth900', 'depth1200']
        }
      }
    },
    {
      id: 'depth900',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/600-900mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300', 'depth600', 'depth900']
        }
      }
    },
    {
      id: 'depth600',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/300-600mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300', 'depth600']
        }
      }
    },
    {
      id: 'depth300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/150-300mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150', 'depth300']
        }
      }
    },
    {
      id: 'depth150',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/<150mm/1',
      showInKey: false,
      visibleWhen: {
        menu: {
          dataset: ['surfacewater'],
          timeframe: ['presentday'],
          aep: ['low'],
          depth: ['depth150']
        }
      }
    },
  ]
}

const surfaceWaterDepthAllDataset = {
  id: 'surfacewaterDepthAll',
  label: 'Surface Water Depth All',
  groupLabel: 'Datasets',
  tiles: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Surface_Water_Spatial_Planning_1_in_1000_Depths_NON_PRODUCTION/VectorTileServer`,
  showInKey: true,
  sourceLayer: 'Surface Water Spatial Planning 1 in 1000 Depths',
  visibleWhen: {
    menu: {
      dataset: ['surfacewater'],
      timeframe: ['presentday'],
      aep: ['low'],
      depth: ['depthAll']
    },
  },
  sublayers: [
    {
      id: 'depthOver2300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/>2300mm/1',
      label: 'Extent over 2300mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[0], dark: nonFloodZoneDepthBandsDark[0] },
      }
    },
    {
      id: 'depth2300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/1200-2300mm/1',
      label: 'Extent over 1200mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[1], dark: nonFloodZoneDepthBandsDark[1] },
      }
    },
    {
      id: 'depth1200',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/900-1200mm/1',
      label: 'Extent over 900mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[2], dark: nonFloodZoneDepthBandsDark[2] },
      }
    },
    {
      id: 'depth900',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/600-900mm/1',
      label: 'Extent over 600mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[3], dark: nonFloodZoneDepthBandsDark[3] },
      }
    },
    {
      id: 'depth600',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/300-600mm/1',
      label: 'Extent over 300mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[4], dark: nonFloodZoneDepthBandsDark[4] },
      }
    },
    {
      id: 'depth300',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/150-300mm/1',
      label: 'Extent over 150mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[5], dark: nonFloodZoneDepthBandsDark[5] },
      }
    },
    {
      id: 'depth150',
      esriStyleLayerId: 'Surface Water Spatial Planning 1 in 1000 Depths/<150mm/1',
      label: 'Extent up to 150mm',
      style: {
        fill: { outdoor: nonFloodZoneDepthBandsLight[6], dark: nonFloodZoneDepthBandsDark[6] },
      }
    },
  ]
}

const surfaceWaterExtentsKey = {
  id: 'surfacewater-extents-key',
  label: 'Surface Water',
  groupLabel: 'Datasets',
  showInKey: true,
  style: {
    stroke: { outdoor: nonFloodZoneLight, dark: nonFloodZoneDark },
    fill: { outdoor: nonFloodZoneLight, dark: nonFloodZoneDark },
  },
  sublayers: [
    {
      id: 'key-150',
      label: 'Full extend of flooding',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth150'] } }
    },
    {
      id: 'key-300',
      label: 'Extent over 150mm',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth300'] } }
    },
    {
      id: 'key-600',
      label: 'Extent over 300mm',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth600'] } }
    },
    {
      id: 'key-900',
      label: 'Extent over 600mm',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth900'] } }
    },
    {
      id: 'key-1200',
      label: 'Extent over 900mm',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth1200'] } }
    },
    {
      id: 'key-2300',
      label: 'Extent over 1200mm',
      showInKey: true,
      visibleWhen: { menu: { dataset: ['surfacewater'], depth: ['depth2300'] } }
    },
    {
      id: 'key-over-2300',
      label: 'Extent over 2300mm',
      showInKey: true,
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
  showInMenu: true,
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
  showInMenu: true,
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
  showInMenu: true,
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
    strokeWidth: 3
  }
}

const datasets = [
  datasetFloodZonesCC, datasetFloodZones,
  surfaceWaterDataset, surfaceWaterDepthAllDataset, surfaceWaterExtentsKey,
  datasetWaterStorageAreas, datasetFloodDefences, datasetMainRivers
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
      { id: 'waterstorage', label: 'Water storage' },
      { id: 'flooddefence', label: 'Flood defence' },
      { id: 'mainrivers', label: 'Main rivers' },
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