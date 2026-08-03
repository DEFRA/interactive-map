export const datasets = [
  {
    id: 'flood-zones-cc',
    label: 'Flood Zones Climate Change',
    groupLabel: 'Datasets',
    esriGroupId: 'flood-zones-group',
    tiles: 'https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_CCP1_NON_PRODUCTION/VectorTileServer',
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
        style: {
          fill: { outdoor: '#F4A582', dark: '#BF3D4A' },
          stroke: 'none'
        }
      },
      {
        id: 'data-unavailable',
        label: 'Climate change data unavailable',
        style: { // This is used just for the key - so that it renders the pattern correctly.
          fillPattern: 'dot',
          fillPatternForegroundColor: { outdoor: '#000000', dark: '#ffffff' },
          stroke: { outdoor: '#000000', dark: '#FFFFFF' }
        },
        showInKey: true,
        showInMenu: false
      },
      {
        id: 'data-unavailable-outline',
        style: {
          stroke: { outdoor: '#000000', dark: '#FFFFFF' }
        },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/0',
        showInKey: false,
        showInMenu: false
      },
      {
        id: 'data-unavailable-light',
        visibleWhen: { mapStyleId: ['outdoor', 'black-and-white'] },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/1',
        esriUseServerStyle: true,
        showInKey: false,
        showInMenu: false
      },
      {
        id: 'data-unavailable-dark',
        visibleWhen: { mapStyleId: ['dark'] },
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea CCP1/Unavailable/2',
        esriUseServerStyle: true,
        showInKey: false,
        showInMenu: false
      }
    ]
  },
  {
    id: 'flood-zones',
    label: 'Flood Zones',
    groupLabel: 'Datasets',
    esriGroupId: 'flood-zones-group',
    tiles: 'https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/Flood_Zones_2_and_3_Rivers_and_Sea_NON_PRODUCTION/VectorTileServer',
    showInKey: true,
    visible: false,
    // showInMenu: true,
    sourceLayer: 'Flood Zones 2 and 3 Rivers and Sea',
    sublayers: [
      {
        id: 'flood-zone-2',
        label: 'Flood Zone 2',
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 2/1',
        showInMenu: true,
        style: {
          fill: { outdoor: '#1d70b8', dark: '#7fcdbb' },
          stroke: 'none'
        }
      },
      {
        id: 'flood-zone-3',
        label: 'Flood Zone 3',
        esriStyleLayerId: 'Flood Zones 2 and 3 Rivers and Sea/Flood Zone 3/1',
        showInMenu: true,
        style: {
          fill: { outdoor: '#003078', dark: '#e5f5e0' },
          stroke: 'none'
        }
      }
    ]
  },
  {
    id: 'esri-standalone',
    label: 'Standalone Layer',
    tiles: 'https://example.com/vtl/standalone',
    visible: true,
    esriStyleLayerId: 'standalone-style',
    style: { fill: '#ff0000', stroke: '#000000' }
  },
  // Grouped: belongs to a GroupLayer, not visible (covers the visible=false branch)
  {
    id: 'esri-grouped',
    label: 'Grouped Layer',
    tiles: 'https://example.com/vtl/grouped',
    visible: false,
    esriGroupId: 'my-group'
  },
  // Server style: setPaintProperties should be skipped
  {
    id: 'esri-server',
    label: 'Server Style Layer',
    tiles: 'https://example.com/vtl/server',
    visible: true,
    esriStyleLayerId: 'server-style-layer',
    esriUseServerStyle: true,
    style: {}
  },
  // Parent with sublayers that have esriStyleLayerId
  {
    id: 'esri-parent',
    label: 'Parent With Sublayers',
    tiles: 'https://example.com/vtl/parent',
    visible: true,
    sublayers: [
      {
        id: 'sub-a',
        label: 'Sub A',
        esriStyleLayerId: 'style-sub-a',
        visible: true,
        style: { fill: '#00ff00' }
      },
      {
        id: 'sub-b',
        label: 'Sub B',
        esriStyleLayerId: 'style-sub-b',
        visible: false,
        style: {}
      }
    ]
  }
]
