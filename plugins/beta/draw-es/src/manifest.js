// /plugins/draw-es/manifest.js
import { initialState, actions } from './reducer.js'
import { DrawInit } from './DrawInit.jsx'
import { newPolygon } from './api/newPolygon.js'
import { editFeature } from './api/editFeature.js'
import { addFeature } from './api/addFeature.js'
import { deleteFeature } from './api/deleteFeature.js'

const buttonSlots = {
  mobile:  { slot: 'actions', showLabel: true },
  tablet:  { slot: 'actions', showLabel: true },
  desktop: { slot: 'actions', showLabel: true }
}

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  InitComponent: DrawInit,

  buttons: [{
    id: 'drawDone',
    label: 'Done',
    variant: 'primary',
    hiddenWhen: ({ pluginState }) => !pluginState.mode,
    enableWhen: ({ pluginState }) => !!pluginState.tempFeature,
    ...buttonSlots
  },{
    id: 'drawCancel',
    label: 'Cancel',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !pluginState.mode,
    ...buttonSlots
  }],

  // keyboardShortcuts: [{
  //   id: 'drawStart',
  //   group: 'Drawing',
  //   title: 'Edit vertex',
  //   command: '<kbd>Spacebar</kbd></dd>'
  // }],

  api: {
    newPolygon,
    editFeature,
    addFeature,
    deleteFeature
  }
}