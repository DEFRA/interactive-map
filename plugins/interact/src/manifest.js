// /plugins/interact/manifest.js
import { InteractInit } from './InteractInit.jsx'
import { initialState, actions } from './reducer.js'
import { enable } from './api/enable.js'
import { disable } from './api/disable.js'
import { clear } from './api/clear.js'
import { selectFeature } from './api/selectFeature.js'
import { unselectFeature } from './api/unselectFeature.js'

export const manifest = {
  InitComponent: InteractInit,

  reducer: {
    initialState,
    actions
  },

  buttons: [{
    id: 'selectAtTarget',
    label: 'Select',
    iconId: 'select',
    variant: 'touch',
    hiddenWhen: ({ appState, pluginState }) => !pluginState.enabled || appState.interfaceType !== 'touch',
    mobile: {
      slot: 'actions',
      showLabel: false
    },
    tablet: {
      slot: 'actions',
      showLabel: false
    },
    desktop: {
      slot: 'actions',
      showLabel: false
    }
  },{
    id: 'selectCancel',
    label: 'Back',
    variant: 'tertiary',
    hiddenWhen: ({ appConfig, appState, pluginState }) => !pluginState.enabled || !(['hybrid', 'buttonFirst'].includes(appConfig.behaviour) && appState.isFullscreen),
    mobile: {
      slot: 'actions',
      showLabel: true
    },
    tablet: {
      slot: 'actions',
      showLabel: true
    },
    desktop: {
      slot: 'actions',
      showLabel: true
    }
  },{
    id: 'selectDone',
    label: 'Continue',
    variant: 'primary',
    excludeWhen: ({ appState, pluginState }) => !pluginState.enabled || !appState.isFullscreen,
    enableWhen: ({ mapState, pluginState }) => !!mapState.markers.items.some(m => m.id === 'location') || !!pluginState.selectionBounds,
    mobile: {
      slot: 'actions',
      showLabel: true
    },
    tablet: {
      slot: 'actions',
      showLabel: true
    },
    desktop: {
      slot: 'actions',
      showLabel: true
    }
  }],

  keyboardShortcuts: [{
    id: 'selectOrMark',
    group: 'Select',
    title: 'Select feature',
    command: '<kbd>Enter</kbd></dd>'
  }],

  icons: [{
    id: 'select',
    svgContent: '<path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'
  }],

  api: {
    enable,
    disable,
    clear,
    selectFeature,
    unselectFeature
  }
}
