// /plugins/flood-menu/manifest.js
import { initialState, actions } from './reducer.js'
import { FloodMenuInit } from './FloodMenuInit.jsx'
import { DrawMenu } from './components/DrawMenu.jsx'

// Targets the `<panelId>-panel` slot convention (mapControls.js) rather than
// a layout slot — `order: 1` splices this control in ahead of the host
// panel's own content (which always renders at order 0, see mapPanels.js).
const controlSlots = {
  mobile: { slot: 'menu-panel', order: 1 },
  tablet: { slot: 'menu-panel', order: 1 },
  desktop: { slot: 'menu-panel', order: 1 }
}

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  InitComponent: FloodMenuInit,

  // drawMenu is the floodMenu plugin's only control today — more get added
  // here as further controls (each with its own id/slot) as functionality grows.
  controls: [{
    id: 'drawMenu',
    label: 'Draw menu',
    ...controlSlots,
    render: DrawMenu
  }]
}
