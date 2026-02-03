// /plugins/datasets/manifest.js
import { initialState, actions } from './reducer.js'
import { DatasetsInit } from './DatasetsInit.jsx'
import { Layers } from './panels/Layers.jsx'
import { Key } from './panels/Key.jsx'
import { showDataset } from './api/showDataset.js'
import { hideDataset } from './api/hideDataset.js'
import { addDataset } from './api/addDataset.js'
import { removeDataset } from './api/removeDataset.js'
import { showFeatures } from './api/showFeatures.js'
import { hideFeatures } from './api/hideFeatures.js'

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
      slot: 'bottom',
      modal: true,
      dismissable: true
    },
    tablet: {
      slot: 'inset',
      dismissable: true,
      exclusive: true,
      width: '300px'
    },
    desktop: {
      slot: 'inset',
      modal: false,
      dismissable: true,
      exclusive: true,
      width: '320px'
    },
    render: Layers
  },{
    id: 'datasetsKey',
    label: 'Key',
    mobile: {
      slot: 'bottom',
      modal: true
    },
    tablet: {
      slot: 'inset',
      width: '300px'
    },
    desktop: {
      slot: 'inset',
      width: '320px'
    },
    render: Key
  }],

  buttons: [{
    id: 'datasetsLayers',
    label: 'Layers',
    panelId: 'datasetsLayers',
    iconId: 'layers',
    excludeWhen: ({ pluginConfig }) => !pluginConfig.datasets.find(l => l.showInLayers),
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
  },{
    id: 'datasetsKey',
    label: 'Key',
    panelId: 'datasetsKey',
    iconId: 'key',
    excludeWhen: ({ pluginConfig }) => !pluginConfig.datasets.find(l => l.showInKey),
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
    svgContent: '<path d="M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z"></path><path d="m20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845"></path>'
  },{
    id: 'key',
    svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
  }],

  api: {
    showDataset,
    hideDataset,
    addDataset,
    removeDataset,
    showFeatures,
    hideFeatures
  }
}
