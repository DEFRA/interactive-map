import { Menu } from './components/Menu/Menu.jsx'
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
      label: 'Layers',
      mobile: { slot: 'drawer', modal: true, dismissible: true },
      tablet: { slot: 'left-top', dismissible: true, exclusive: true, width: '260px' },
      desktop: { slot: 'left-top', modal: false, dismissible: true, exclusive: true, width: '280px' },
      render: Menu
    }],
  buttons: [{
    id: 'menuButton',
    label: 'Layers',
    panelId: 'menu',
    iconId: 'layersMenu',
    mobile: { slot: 'top-left', showLabel: true },
    tablet: { slot: 'top-left', showLabel: true },
    desktop: { slot: 'top-left', showLabel: true }
  }],

  icons: [{
    id: 'layersMenu',
    svgContent: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>'
  }]
}
