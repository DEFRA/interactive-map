// src/App/store/appActionsMap.js
import { getInitialOpenPanels } from '../../config/getInitialOpenPanels.js'
import { getIsFullscreen } from '../../utils/getIsFullscreen.js'
import { shallowEqual } from '../../utils/shallowEqual.js'
import { registerButton as registerButtonFn, addButton as addButtonFn } from '../registry/buttonRegistry.js'
import { registerPanel as registerPanelFn, addPanel as addPanelFn, removePanel as removePanelFn } from '../registry/panelRegistry.js'
import { registerControl as registerControlFn, addControl as addControlFn } from '../registry/controlRegistry.js'

// Interal helper
function buildOpenPanels (state, panelId, breakpoint, props) {
  const panelConfig = state.panelConfig || state.panelRegistry.getPanelConfig()
  const bpConfig = panelConfig[panelId]?.[breakpoint]
  const isExclusiveNonModal = !!bpConfig.exclusive && !bpConfig.modal
  const isModal = !!bpConfig.modal

  // Remove exclusive panels
  const filteredPanels = Object.fromEntries(
    Object.entries(state.openPanels).filter(
      ([key]) => !panelConfig[key]?.[breakpoint]?.exclusive
    )
  )

  return {
    ...(isExclusiveNonModal ? {} : filteredPanels),
    ...(isModal ? state.openPanels : {}),
    [panelId]: { props }
  }
}

const setMode = (state, payload) => {
  const panelConfig = state.panelConfig || state.panelRegistry.getPanelConfig()

  return {
    ...state,
    mode: payload,
    previousMode: state.mode,
    openPanels: getInitialOpenPanels(panelConfig, state.breakpoint, state.openPanels)
  }
}

const revertMode = (state) => {
  const panelConfig = state.panelConfig || state.panelRegistry.getPanelConfig()

  return {
    ...state,
    mode: state.previousMode,
    previousMode: state.mode,
    openPanels: getInitialOpenPanels(panelConfig, state.breakpoint, state.openPanels)
  }
}

const setMedia = (state, payload) => {
  return {
    ...state,
    ...payload
  }
}

const setHybridFullscreen = (state, payload) => {
  return {
    ...state,
    isFullscreen: payload
  }
}

const setBreakpoint = (state, payload) => {
  const { behaviour, hybridWidth, maxMobileWidth } = payload
  const panelIds = Object.keys(state.openPanels)
  const lastPanelId = panelIds.at(-1)

  // For hybrid, isFullscreen is controlled by media query via SET_HYBRID_FULLSCREEN
  // For other behaviours, calculate it here
  const isFullscreen = behaviour === 'hybrid'
    ? state.isFullscreen
    : getIsFullscreen({ behaviour, hybridWidth, maxMobileWidth })

  return {
    ...state,
    breakpoint: payload.breakpoint,
    isFullscreen,
    previousOpenPanels: state.openPanels,
    openPanels: lastPanelId
      ? buildOpenPanels(
        state,
        lastPanelId,
        payload.breakpoint,
        state.openPanels[lastPanelId]?.props || {}
      )
      : {}
  }
}

const setInterfaceType = (state, payload) => {
  return {
    ...state,
    interfaceType: payload
  }
}

const openPanel = (state, payload) => {
  const { panelId, props = {} } = payload

  return {
    ...state,
    previousOpenPanels: state.openPanels,
    openPanels: buildOpenPanels(state, panelId, state.breakpoint, props)
  }
}

const closePanel = (state, payload) => {
  // eslint-disable-next-line no-unused-vars
  const { [payload]: _, ...remainingPanels } = state.openPanels

  return {
    ...state,
    previousOpenPanels: state.openPanels,
    openPanels: remainingPanels
  }
}

const closeAllPanels = (state) => {
  return {
    ...state,
    previousOpenPanels: state.openPanels,
    openPanels: {}
  }
}

const restorePreviousPanels = (state) => {
  return {
    ...state,
    openPanels: state.previousOpenPanels || {},
    previousOpenPanels: state.openPanels
  }
}

const toggleHasExclusiveControl = (state, payload) => {
  return {
    ...state,
    hasExclusiveControl: payload
  }
}

const setSafeZoneInset = (state, { safeZoneInset, syncMapPadding = true }) => {
  return shallowEqual(state.safeZoneInset, safeZoneInset)
    ? state
    : {
        ...state,
        safeZoneInset,
        syncMapPadding,
        isLayoutReady: true
      }
}

const toggleButtonDisabled = (state, payload) => {
  const { id, isDisabled } = payload
  const updated = new Set(state.disabledButtons)

  if (isDisabled) {
    updated.add(id)
  } else {
    updated.delete(id)
  }

  return {
    ...state,
    disabledButtons: updated
  }
}

const toggleButtonHidden = (state, payload) => {
  const { id, isHidden } = payload
  const updated = new Set(state.hiddenButtons)

  if (isHidden) {
    updated.add(id)
  } else {
    updated.delete(id)
  }

  return {
    ...state,
    hiddenButtons: updated
  }
}

const toggleButtonPressed = (state, payload) => {
  const { id, isPressed } = payload
  const updated = new Set(state.pressedButtons)

  if (isPressed) {
    updated.add(id)
  } else {
    updated.delete(id)
  }

  return {
    ...state,
    pressedButtons: updated
  }
}

const toggleButtonExpanded = (state, payload) => {
  const { id, isExpanded } = payload
  const updated = new Set(state.expandedButtons)

  if (isExpanded) {
    updated.add(id)
  } else {
    updated.delete(id)
  }

  return {
    ...state,
    expandedButtons: updated
  }
}

// Registry mutation actions
const registerButton = (state, payload) => {
  return {
    ...state,
    buttonConfig: registerButtonFn(state.buttonConfig, payload)
  }
}

const addButton = (state, payload) => {
  const { id, config } = payload
  const newButtonConfig = addButtonFn(state.buttonConfig, id, config)

  // Set hidden state
  const hiddenButtons = new Set(state.hiddenButtons)
  if (config.isHidden) {
    hiddenButtons.add(id)
  }

  // Set disabled state
  const disabledButtons = new Set(state.disabledButtons)
  if (config.isDisabled) {
    disabledButtons.add(id)
  }

  // Set pressed state
  const pressedButtons = new Set(state.pressedButtons)
  if (config.isPressed) {
    pressedButtons.add(id)
  }

  // Set expanded state
  const expandedButtons = new Set(state.expandedButtons)
  if (config.isExpanded) {
    expandedButtons.add(id)
  }

  // Also update the registry instance for persistence across app lifecycle
  if (state.buttonRegistry?.addButton) {
    state.buttonRegistry.addButton(id, config)
  }

  return {
    ...state,
    buttonConfig: newButtonConfig,
    hiddenButtons,
    disabledButtons,
    pressedButtons,
    expandedButtons
  }
}

const registerPanel = (state, payload) => {
  return {
    ...state,
    panelConfig: registerPanelFn(state.panelConfig, payload)
  }
}

const addPanel = (state, payload) => {
  const { id, config } = payload
  const newPanelConfig = addPanelFn(state.panelConfig, id, config)
  const panel = newPanelConfig[id]

  // Also update the registry instance for persistence across app lifecycle
  if (state.panelRegistry?.addPanel) {
    state.panelRegistry.addPanel(id, config)
  }

  // Check if panel should be initially open
  const bpConfig = panel?.[state.breakpoint]
  const shouldOpen = bpConfig?.initiallyOpen

  return {
    ...state,
    panelConfig: newPanelConfig,
    openPanels: shouldOpen
      ? buildOpenPanels(
        { ...state, panelConfig: newPanelConfig },
        id,
        state.breakpoint,
        {}
      )
      : state.openPanels
  }
}

const removePanel = (state, payload) => {
  const id = payload
  // eslint-disable-next-line no-unused-vars
  const { [id]: _, ...remainingPanels } = state.openPanels

  // Also update the registry instance for persistence across app lifecycle
  if (state.panelRegistry?.removePanel) {
    state.panelRegistry.removePanel(id)
  }

  return {
    ...state,
    panelConfig: removePanelFn(state.panelConfig, id),
    openPanels: remainingPanels
  }
}

const registerControl = (state, payload) => {
  return {
    ...state,
    controlConfig: registerControlFn(state.controlConfig, payload)
  }
}

const addControl = (state, payload) => {
  const { id, config } = payload
  const newControlConfig = addControlFn(state.controlConfig, id, config)

  // Also update the registry instance for persistence across app lifecycle
  if (state.controlRegistry?.addControl) {
    state.controlRegistry.addControl(id, config)
  }

  return {
    ...state,
    controlConfig: newControlConfig
  }
}

export const actionsMap = {
  SET_BREAKPOINT: setBreakpoint,
  SET_MEDIA: setMedia,
  SET_HYBRID_FULLSCREEN: setHybridFullscreen,
  SET_INTERFACE_TYPE: setInterfaceType,
  SET_MODE: setMode,
  SET_SAFE_ZONE_INSET: setSafeZoneInset,
  REVERT_MODE: revertMode,
  OPEN_PANEL: openPanel,
  CLOSE_PANEL: closePanel,
  CLOSE_ALL_PANELS: closeAllPanels,
  RESTORE_PREVIOUS_PANELS: restorePreviousPanels,
  TOGGLE_HAS_EXCLUSIVE_CONTROL: toggleHasExclusiveControl,
  TOGGLE_BUTTON_DISABLED: toggleButtonDisabled,
  TOGGLE_BUTTON_HIDDEN: toggleButtonHidden,
  TOGGLE_BUTTON_PRESSED: toggleButtonPressed,
  TOGGLE_BUTTON_EXPANDED: toggleButtonExpanded,
  // Registry actions
  REGISTER_BUTTON: registerButton,
  ADD_BUTTON: addButton,
  REGISTER_PANEL: registerPanel,
  ADD_PANEL: addPanel,
  REMOVE_PANEL: removePanel,
  REGISTER_CONTROL: registerControl,
  ADD_CONTROL: addControl
}
