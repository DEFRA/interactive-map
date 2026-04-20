// /plugins/datasets/manifest.js
import { initialState, actions } from './reducer.js'
import { DatasetsInit } from './DatasetsInit.jsx'
import { Layers } from './panels/Layers.jsx'
import { Key } from './panels/Key.jsx'
import { addDataset } from './api/addDataset.js'
import { removeDataset } from './api/removeDataset.js'
import { setDatasetVisibility } from './api/setDatasetVisibility.js'
import { setFeatureVisibility } from './api/setFeatureVisibility.js'
import { setStyle } from './api/setStyle.js'
import { getStyle } from './api/getStyle.js'
import { setOpacity } from './api/setOpacity.js'
import { getOpacity } from './api/getOpacity.js'
import { setData } from './api/setData.js'

export const manifest = {
  InitComponent: DatasetsInit,

  reducer: {
    initialState,
    actions
  },

  panels: [{
    id: 'datasetsLayers',
    label: 'Layers',
    mobile: {
      slot: 'drawer',
      modal: true,
      dismissible: true
    },
    tablet: {
      slot: 'left-top',
      dismissible: true,
      exclusive: true,
      width: '260px'
    },
    desktop: {
      slot: 'left-top',
      modal: false,
      dismissible: true,
      exclusive: true,
      width: '280px'
    },
    render: Layers
  }, {
    id: 'datasetsKey',
    label: 'Key',
    mobile: {
      slot: 'drawer',
      modal: true
    },
    tablet: {
      slot: 'left-top',
      width: '260px'
    },
    desktop: {
      slot: 'left-top',
      width: '280px'
    },
    render: Key
  }],

  buttons: [{
    id: 'datasetsLayers',
    label: 'Layers',
    panelId: 'datasetsLayers',
    iconId: 'layers',
    excludeWhen: ({ pluginConfig }) => !pluginConfig.datasets.some(l =>
      l.showInMenu || l.sublayers?.some(r => r.showInMenu)
    ),
    mobile: {
      slot: 'top-left',
      showLabel: true
    },
    tablet: {
      slot: 'top-left',
      showLabel: true
    },
    desktop: {
      slot: 'top-left',
      showLabel: true
    }
  }, {
    id: 'datasetsKey',
    label: 'Key',
    panelId: 'datasetsKey',
    iconId: 'key',
    excludeWhen: ({ pluginConfig }) => !pluginConfig.datasets.some(l => l.showInKey),
    mobile: {
      slot: 'top-left',
      showLabel: false
    },
    tablet: {
      slot: 'top-left',
      showLabel: true
    },
    desktop: {
      slot: 'top-left',
      showLabel: true
    }
  }],

  icons: [{
    id: 'layers',
    svgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>'
  }, {
    id: 'key',
    svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
  }],

  api: {
    addDataset,
    removeDataset,
    setDatasetVisibility,
    setFeatureVisibility,
    setStyle,
    getStyle,
    setOpacity,
    getOpacity,
    setData
  }
}
