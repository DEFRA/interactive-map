// /plugins/map-styles/manifest.js
import { MapStylesInit } from './MapStylesInit.jsx'
import { MapStyles } from './MapStyles.jsx'

export const manifest = {
  InitComponent: MapStylesInit,

  panels: [{
    id: 'mapStyles',
    label: 'Map styles',
    mobile: {
      slot: 'bottom',
      modal: true,
      dismissable: true
    },
    tablet: {
      slot: 'map-styles-button',
      modal: true,
      width: '400px',
      dismissable: true
    },
    desktop: {
      slot: 'map-styles-button',
      modal: true,
      width: '400px',
      dismissable: true
    },
    render: MapStyles // will be wrapped automatically
  }],

  buttons: [{
    id: 'mapStyles',
    label: 'Map styles',
    panelId: 'mapStyles',
    iconId: 'map',
    mobile: {
      slot: 'right-top',
      showLabel: false
    },
    tablet: {
      slot: 'right-top',
      showLabel: false,
      order: 1
    },
    desktop: {
      slot: 'right-top',
      showLabel: false,
      order: 1
    }
  }],

  icons: [{
    id: 'map',
    svgContent: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'
  }]
}
