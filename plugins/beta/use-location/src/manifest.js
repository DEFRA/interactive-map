// /plugins/use-location/manifest.js
import { initialState, actions } from './reducer.js'
import { UseLocationInit } from './UseLocationInit.jsx'
import { UseLocation } from './UseLocation.jsx'

const buttonSlot = {
  slot: 'right-top',
  showLabel: false
}

export const manifest = {
  InitComponent: UseLocationInit,

  reducer: {
    initialState,
    actions
  },

  buttons: [{
    id: 'useLocation',
    group: 'location',
    label: 'Use your location',
    iconId: 'locateFixed',
    hiddenWhen: () => !navigator.geolocation,
    mobile: buttonSlot,
    tablet: buttonSlot,
    desktop: buttonSlot
  }],

  panels: [{
    id: 'useLocation',
    label: 'Problem getting your location',
    mobile: {
      slot: 'banner',
      initiallyOpen: false,
      dismissable: true,
      modal: true
    },
    tablet: {
      slot: 'banner',
      initiallyOpen: false,
      dismissable: true,
      modal: true
    },
    desktop: {
      slot: 'banner',
      initiallyOpen: false,
      dismissable: true,
      modal: true
    },
    render: UseLocation
  }],

  icons: [{
    id: 'locateFixed',
    svgContent: '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>'
  }]
}
