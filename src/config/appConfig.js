import { KeyboardHelp } from '../App/components/KeyboardHelp/KeyboardHelp.jsx'
import { MoveControl } from '../App/components/MoveControl/MoveControl.jsx'

const keyboardBasePanelSlots = {
  slot: 'middle',
  open: false,
  dismissible: true,
  modal: true
}

const buttonSlots = {
  slot: 'right-top',
  showLabel: false
}

const exitButtonSlots = {
  slot: 'top-left',
  showLabel: false
}

const journeyBackSlots = { slot: 'actions', showLabel: true }
const journeyContinueSlots = { slot: 'actions', showLabel: true, order: 10 }

// Default app buttons, panels and icons
export const defaultAppConfig = {
  buttons: [{
    id: 'journeyBack',
    label: ({ appConfig }) => appConfig.backAndContinue?.backLabel,
    variant: 'tertiary',
    onClick: (_e, { appConfig, services }) =>
      appConfig.behaviour === 'mapOnly' ? globalThis.history.back() : services.closeApp(),
    excludeWhen: ({ appConfig, appState }) =>
      !appConfig.backAndContinue?.backLabel ||
      !appState.isFullscreen ||
      (appConfig.behaviour === 'mapOnly' && globalThis.history.length <= 1),
    mobile: journeyBackSlots,
    tablet: journeyBackSlots,
    desktop: journeyBackSlots
  }, {
    id: 'journeyContinue',
    label: ({ appConfig }) => appConfig.backAndContinue?.continueLabel,
    variant: 'primary',
    onClick: (_e, { services, pluginStates, mapState }) => services.eventBus.emit('app:continue', { pluginStates, mapState }),
    excludeWhen: ({ appConfig, appState }) => !appConfig.backAndContinue?.continueLabel || !appState.isFullscreen,
    mobile: journeyContinueSlots,
    tablet: journeyContinueSlots,
    desktop: journeyContinueSlots
  }, {
    id: 'exit',
    label: 'Exit',
    iconId: 'close',
    onClick: (_e, { services }) => services.closeApp(),
    excludeWhen: ({ appConfig, appState }) => !appConfig.hasExitButton || !appState.isFullscreen,
    mobile: exitButtonSlots,
    tablet: exitButtonSlots,
    desktop: exitButtonSlots
  }, {
    id: 'fullscreen',
    label: () => `${document.fullscreenElement ? 'Exit' : 'Enter'} fullscreen`,
    iconId: () => document.fullscreenElement ? 'minimise' : 'maximise',
    onClick: (_e, { appState }) => {
      const container = appState.layoutRefs.appContainerRef.current
      document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen()
    },
    excludeWhen: ({ appState, appConfig }) => !appConfig.enableFullscreen || appState.isFullscreen,
    mobile: buttonSlots,
    tablet: buttonSlots,
    desktop: buttonSlots
  }, {
    id: 'zoomIn',
    group: { name: 'zoom', label: 'Zoom controls', order: 0 },
    label: 'Zoom in',
    iconId: 'plus',
    keepFocus: true,
    onClick: (_e, { mapProvider, appConfig }) => mapProvider.zoomIn(appConfig.zoomDelta),
    excludeWhen: ({ appState, appConfig }) => !appConfig.enableZoomControls || appState.interfaceType === 'touch',
    enableWhen: ({ mapState }) => !mapState.isAtMaxZoom,
    mobile: buttonSlots,
    tablet: buttonSlots,
    desktop: buttonSlots
  }, {
    id: 'zoomOut',
    group: { name: 'zoom', label: 'Zoom controls', order: 0 },
    label: 'Zoom out',
    iconId: 'minus',
    keepFocus: true,
    onClick: (_e, { mapProvider, appConfig }) => mapProvider.zoomOut(appConfig.zoomDelta),
    excludeWhen: ({ appState, appConfig }) => !appConfig.enableZoomControls || appState.interfaceType === 'touch',
    enableWhen: ({ mapState }) => !mapState.isAtMinZoom,
    mobile: buttonSlots,
    tablet: buttonSlots,
    desktop: buttonSlots
  }, {
    id: 'moveControl',
    label: 'Pan and zoom controls',
    iconId: 'move',
    keepFocus: true,
    isExpanded: false,
    ariaControls: ({ appConfig }) => `${appConfig.id}-move-control`,
    onClick: (_e, { appState }) => appState.dispatch({
      type: 'TOGGLE_BUTTON_EXPANDED',
      payload: { id: 'moveControl', isExpanded: !appState.expandedButtons.has('moveControl') }
    }),
    excludeWhen: ({ appConfig }) => !appConfig.enableMoveControl,
    mobile: buttonSlots,
    tablet: buttonSlots,
    desktop: buttonSlots
  }],

  panels: [{
    id: 'keyboardHelp',
    label: 'Keyboard shortcuts',
    mobile: {
      ...keyboardBasePanelSlots
    },
    tablet: {
      ...keyboardBasePanelSlots,
      width: '500px'
    },
    desktop: {
      ...keyboardBasePanelSlots,
      width: '500px'
    },
    render: (props) => <KeyboardHelp context={props?.context} />
  }],

  controls: [{
    id: 'moveControl',
    label: 'Pan and zoom controls',
    excludeWhen: ({ appConfig }) => !appConfig.enableMoveControl,
    mobile: {
      slot: 'right-bottom'
    },
    tablet: {
      slot: 'right-top'
    },
    desktop: {
      slot: 'right-top'
    },
    render: MoveControl
  }],

  icons: [{
    id: 'maximise',
    svgContent: '<path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/>'
  }, {
    id: 'minimise',
    svgContent: '<path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/>'
  }, {
    id: 'plus',
    svgContent: '<path d="M5 12h14"/><path d="M12 5v14"/>'
  }, {
    id: 'minus',
    svgContent: '<path d="M5 12h14"/>'
  }, {
    id: 'chevron',
    svgContent: '<path d="m6 9 6 6 6-6"/>'
  }, {
    id: 'move',
    svgContent: '<path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/>'
  }]
}

// Used by addButton
const defaultButtonSlots = {
  slot: 'right-top',
  showLabel: true
}

export const defaultButtonConfig = {
  label: 'Button',
  mobile: defaultButtonSlots,
  tablet: defaultButtonSlots,
  desktop: defaultButtonSlots
}

// Used by addPanel
export const defaultPanelConfig = {
  label: 'Panel',
  focus: true,
  mobile: {
    slot: 'drawer',
    open: true,
    dismissible: true,
    modal: false,
    showLabel: true
  },
  tablet: {
    slot: 'left-top',
    open: true,
    dismissible: true,
    modal: false,
    showLabel: true
  },
  desktop: {
    slot: 'left-top',
    open: true,
    dismissible: true,
    modal: false,
    showLabel: true
  },
  render: null,
  html: null
}

// Used by addControl
export const defaultControlConfig = {
  label: 'Control',
  mobile: {
    slot: 'drawer'
  },
  tablet: {
    slot: 'top-left'
  },
  desktop: {
    slot: 'top-left'
  }
}

export const scaleFactor = {
  small: 1,
  medium: 1.5,
  large: 2
}
