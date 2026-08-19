import { LayersMenu } from './components/LayersMenu/LayersMenu.jsx'
import './registry/getDatasetRegistry.js'
import { MenuInit } from './initialise/MenuInit.jsx'
import { initialState, actions } from './reducers/pluginState.js'

export const manifest = {
  InitComponent: MenuInit,
  reducer: {
    initialState,
    actions
  },
  panels: [
    {
      id: 'menu',
      label: 'Menu - Layers',
      mobile: { slot: 'drawer', modal: true, dismissible: true },
      tablet: { slot: 'left-top', dismissible: true, exclusive: true, width: '260px' },
      desktop: { slot: 'left-top', modal: false, dismissible: true, exclusive: true, width: '280px' },
      render: LayersMenu
    }],
  buttons: [{
    id: 'menuButton',
    label: 'Menu - Layers',
    panelId: 'menu',
    iconId: 'layers',
    // excludeWhen: ({ pluginConfig }) => !pluginConfig.menu && !pluginConfig.datasets.some(l =>
    //   l.showInMenu || l.sublayers?.some(r => r.showInMenu)
    // ),
    mobile: { slot: 'top-left', showLabel: true },
    tablet: { slot: 'top-left', showLabel: true },
    desktop: { slot: 'top-left', showLabel: true }
  }],

  icons: [{
    id: 'key',
    svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
  }]
}
