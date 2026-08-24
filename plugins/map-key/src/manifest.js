import { MapKey } from './components/Key/MapKey.jsx'
import { MapKeyInit } from './initialise/MapKeyInit.jsx'

export const manifest = {
  InitComponent: MapKeyInit,
  panels: [
    {
      id: 'mapKey',
      label: 'Key',
      mobile: { slot: 'drawer', modal: true },
      tablet: { slot: 'left-top', width: '260px' },
      desktop: { slot: 'left-top', width: '280px' },
      render: MapKey
    }],

  buttons: [{
    id: 'mapKey',
    panelId: 'mapKey',
    label: 'Key',
    iconId: 'key',
    mobile: { slot: 'top-left', showLabel: false },
    tablet: { slot: 'top-left', showLabel: true },
    desktop: { slot: 'top-left', showLabel: true }
  }],

  icons: [{
    id: 'key',
    svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
  }]
}
