import InteractiveMap from '../../src/index.js'
import esriProvider from '/providers/beta/esri/src/index.js'
// Plugins
import mapStylesPlugin from '/plugins/beta/map-styles/src/index.js'
import createDatasetsPlugin from '/plugins/beta/datasets/src/index.js'
// Setup
import { vtsMapStyles27700 } from './mapStyles.js'
import { transformGeocodeRequest, transformVtsRequest3857, setupEsriConfig } from './auth.js'

const datasetsPlugin = createDatasetsPlugin({
  globals: {
    opacityMode: 'global', // 'dataset', 'global' or 'multiply'
    opacity: 0.75,
    visible: true
  },
  datasets: []
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