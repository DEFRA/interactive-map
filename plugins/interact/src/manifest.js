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
    variant: 'primary',
    hiddenWhen: ({ appState, pluginState }) => !pluginState.enabled || !['touch', 'keyboard'].includes(appState.interfaceType),
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

  api: {
    enable,
    disable,
    clear,
    selectFeature,
    unselectFeature
  }
}
