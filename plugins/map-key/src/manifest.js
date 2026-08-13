// /plugins//manifest.js
import { MapKey } from './MapKey.jsx'

export const manifest = {
  panels: [
    {
      id: 'mapKey',
      label: 'MAP Key',
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
    // excludeWhen: ({ pluginConfig }) => !pluginConfig.datasets.some(l => l.showInKey),
    mobile: { slot: 'top-left', showLabel: false },
    tablet: { slot: 'top-left', showLabel: true },
    desktop: { slot: 'top-left', showLabel: true }
  }],

  icons: [{
    id: 'key',
    svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
  }]
}
