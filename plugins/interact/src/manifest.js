// /plugins/interact/manifest.js
import { InteractInit } from './InteractInit.jsx'
import { isSelectMarkerOnly } from './utils/interactionModes.js'
import { initialState, actions } from './reducer.js'
import { enable } from './api/enable.js'
import { disable } from './api/disable.js'
import { clear } from './api/clear.js'
import { selectFeature } from './api/selectFeature.js'
import { unselectFeature } from './api/unselectFeature.js'
import { selectMarker } from './api/selectMarker.js'
import { unselectMarker } from './api/unselectMarker.js'

const SELECT_FEATURES_GROUP = 'Select features'

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
    // Hidden for touch when selectMarker is the only mode — markers have a sufficient tap target
    // and the Select button is only needed alongside the crosshair. Mirrors the crosshair logic in InteractInit.
    hiddenWhen: ({ appState, pluginState }) =>
      !pluginState.enabled || appState.interfaceType !== 'touch' || isSelectMarkerOnly(pluginState.interactionModes),
    mobile: {
      slot: 'actions'
    },
    tablet: {
      slot: 'actions'
    },
    desktop: {
      slot: 'actions'
    }
  }],

  keyboardShortcuts: [
    {
      id: 'clickAtTarget',
      title: 'Click at target',
      command: '<kbd>Enter</kbd>'
    },
    {
      id: 'selectFeatures',
      group: SELECT_FEATURES_GROUP,
      context: 'listbox',
      title: 'Select features',
      command: '<kbd>Tab</kbd>'
    },
    {
      id: 'navigateFeatures',
      group: SELECT_FEATURES_GROUP,
      context: 'listbox',
      title: 'Navigate features',
      command: '<kbd>↑</kbd> or <kbd>↓</kbd>'
    },
    {
      id: 'selectFeature',
      group: SELECT_FEATURES_GROUP,
      context: 'listbox',
      title: 'Select a feature',
      command: '<kbd>Enter</kbd> or <kbd>Space</kbd>'
    },
    {
      id: 'dismissHintOrReturn',
      group: SELECT_FEATURES_GROUP,
      context: 'listbox',
      title: 'Dismiss hint / return to map',
      command: '<kbd>Escape</kbd>'
    }
  ],

  icons: [{
    id: 'select',
    svgContent: '<path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'
  }],

  api: {
    enable,
    disable,
    clear,
    selectFeature,
    unselectFeature,
    selectMarker,
    unselectMarker
  }
}
