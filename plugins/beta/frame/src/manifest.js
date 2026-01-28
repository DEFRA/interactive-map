// /plugins/frame/manifest.js
import { initialState, actions } from './reducer.js'
import { FrameInit } from './FrameInit.jsx'
import { Frame } from './Frame.jsx'
import { addFrame } from './api/addFrame.js'
import { editFeature } from './api/editFeature.js'

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

  InitComponent: FrameInit,

  controls: [{
    id: 'frame',
    label: 'Frame',
    mobile: {
      slot: 'middle'
    },
    tablet: {
      slot: 'middle'
    },
    desktop: {
      slot: 'middle'
    },
    render: Frame
  }],

  buttons: [{
    id: 'frameDone',
    label: 'Done',
    variant: 'primary',
    hiddenWhen: ({ pluginState }) => !pluginState.frame,
    ...buttonSlots
  },{
    id: 'frameCancel',
    label: 'Cancel',
    variant: 'tertiary',
    hiddenWhen: ({ pluginState }) => !pluginState.frame,
    ...buttonSlots
  }],

  api: {
    addFrame,
    editFeature
  }
}
