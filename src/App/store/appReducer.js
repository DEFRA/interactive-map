import { actionsMap } from './appActionsMap.js'
import { getMediaState } from '../../utils/getMediaState.js'
import { getIsFullscreen } from '../../utils/getIsFullscreen.js'
import { getInitialOpenPanels } from '../../config/getInitialOpenPanels.js'

export const initialState = (config) => {
  const {
    initialBreakpoint,
    initialInterfaceType,
    appColorScheme,
    autoColorScheme,
    pluginRegistry,
    buttonRegistry,
    panelRegistry,
    controlRegistry,
    mode
  } = config

  const {
    preferredColorScheme,
    prefersReducedMotion
  } = getMediaState()

  // Initial isFullscreen
  const isFullscreen = getIsFullscreen(config)

  // Initial open panels
  const panelConfig = panelRegistry.getPanelConfig()
  const openPanels = getInitialOpenPanels(panelConfig, initialBreakpoint)

  return {
    isLayoutReady: false,
    breakpoint: initialBreakpoint,
    interfaceType: initialInterfaceType,
    preferredColorScheme: autoColorScheme ? preferredColorScheme : appColorScheme,
    prefersReducedMotion,
    isFullscreen,
    mode: mode || null,
    previousMode: null,
    safeZoneInset: null,
    disabledButtons: new Set(),
    hiddenButtons: new Set(),
    pressedButtons: new Set(),
    expandedButtons: new Set(),
    hasExclusiveControl: false,
    openPanels,
    previousOpenPanels: {},
    syncMapPadding: true,
    pluginRegistry,
    buttonRegistry,
    panelRegistry,
    controlRegistry,
    // Registry configs stored in state for immutability
    buttonConfig: buttonRegistry.getButtonConfig(),
    panelConfig: panelRegistry.getPanelConfig(),
    controlConfig: controlRegistry.getControlConfig()
  }
}

export const reducer = (state, action) => {
  const { type, payload } = action
  const fn = actionsMap[type]
  if (fn) {
    return fn(state, payload)
  }
  return state
}
