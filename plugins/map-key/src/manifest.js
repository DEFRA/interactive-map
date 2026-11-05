import { MapKey } from './components/Key/MapKey.jsx'
import { MapKeyInit } from './initialise/MapKeyInit.jsx'
import { initialState, actions } from './reducers/pluginState.js'
import { api } from './api/index.js'

export const manifest = {
  InitComponent: MapKeyInit,
  reducer: { initialState, actions },
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
    mobile: { slot: 'top-left', showLabel: true },
    tablet: { slot: 'top-left', showLabel: true },
    desktop: { slot: 'top-left', showLabel: true }
  }],

  icons: [{
    id: 'key',
    // svgContent: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'
    svgContent: '<g stroke-width="2"><path d="M13 5h8m-8 7h8m-8 7h8"/><circle cx="6" cy="17.25" r="3.25"/><path d="M3.083 9.313c-.01.001-.02.001-.03.001-.303 0-.553-.25-.553-.553a.55.55 0 0 1 .089-.3l2.943-4.676c.097-.175.283-.284.483-.284.186 0 .361.094.463.25l2.924 4.693a.55.55 0 0 1 .099.316c0 .303-.248.552-.551.553H3.084z"/></g>'
  }],
  api
}
