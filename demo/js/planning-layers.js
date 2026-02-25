import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'

const vectorTileLayers = [
  {
    n: 'Flood_Zones_2_and_3_Rivers_and_Sea',
    v: '_NON_PRODUCTION',
    s: 'Flood Zones 2 and 3 Rivers and Sea',
    m: '_Model_Origin_Layer',
    q: 'floodzones-presentday'
  },
  // {
  //   n: 'Flood_Zones_2_and_3_Rivers_and_Sea_CCP1',
  //   v: '_NON_PRODUCTION',
  //   s: 'Flood Zones 2 and 3 Rivers and Sea CCP1',
  //   m: '_depth_Model_Origin_Layer_gdb',
  //   q: 'floodzones-climatechange'
  // }
  // { n: 'Surface_Water_Spatial_Planning_1_in_1000_Depths', v: '_NON_PRODUCTION', m: '_depth_Model_Origin_Layer_gdb2', q: 'surfacewater-low' },
  // { n: 'Surface_Water_Spatial_Planning_1_in_100_Depths', v: '_NON_PRODUCTION', m: '_depth_Model_Origin_Layer_gdb', q: 'surfacewater-medium' },
  // { n: 'Surface_Water_Spatial_Planning_1_in_30_Depths', v: '_NON_PRODUCTION', m: '_Model_Origin_Layer', q: 'surfacewater-high' },
  // { n: 'Surface_Water_Spatial_Planning_1_in_1000_CCP1_Depths', v: '_NON_PRODUCTION', m: '_Model_Origin_Layer', q: 'surfacewater-low-climatechange' },
  // { n: 'Surface_Water_Spatial_Planning_1_in_100_CCP1_Depths', v: '_NON_PRODUCTION', m: '_Model_Origin_Layer_gdb', q: 'surfacewater-medium-climatechange' },
  // { n: 'Surface_Water_Spatial_Planning_1_in_30_CCP1_Depths', v: '_NON_PRODUCTION', m: '_Model_Origin_Layer_gdb', q: 'surfacewater-high-climatechange' },
]

function addOrRemoveDatasets (mapProvider, datasets) {
  vectorTileLayers.forEach((layer) => {
    const vectorTileLayer = new VectorTileLayer({
      id: layer.n,
      url: `https://tiles.arcgis.com/tiles/JZM7qJpmv7vJ0Hzx/arcgis/rest/services/${layer.n}${layer.v}/VectorTileServer`,
      opacity: 0.75,
      visible: true
    })
    mapProvider.map.add(vectorTileLayer)
  })
}

function addOrRemoveMapFeatures (mapProvider, mapFeatures) {
  console.log('toggleMapFeatures', mapFeatures)
}

export {
  addOrRemoveDatasets,
  addOrRemoveMapFeatures
}