// /plugins/search/manifest.js
import { initialState, actions } from './reducer.js'
import { Search } from './Search.jsx'

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  // Standard MapButton that toggles the plugin's own `isExpanded` state to reveal the form.
  buttons: [{
    id: 'search',
    label: 'Search',
    iconId: 'search',
    // aria-controls the form rendered by the control
    ariaControls: ({ appConfig }) => `${appConfig.id}-search-form`,
    // Mirrors isExpanded into appState so MapButton renders aria-expanded
    expandedWhen: ({ pluginState }) => pluginState.isExpanded,
    // No trigger in default-expanded mode — the form is always visible there
    excludeWhen: ({ pluginConfig }) => Boolean(pluginConfig.expanded),
    // Trigger stays hidden-but-focusable via CSS while open, so keep focus here rather than the viewport
    keepFocus: true,
    onClick: (_e, { pluginState, services }) => {
      pluginState.dispatch({ type: 'TOGGLE_EXPANDED', payload: true })
      services.eventBus.emit('search:open')
    },
    mobile: {
      slot: 'top-right',
      showLabel: false
    },
    tablet: {
      slot: 'top-left',
      showLabel: false
    },
    desktop: {
      slot: 'top-left',
      showLabel: false
    }
  }],

  controls: [{
    id: 'search',
    mobile: {
      slot: 'header'
    },
    tablet: {
      slot: 'top-left'
    },
    desktop: {
      slot: 'top-left'
    },
    render: Search
  }],

  icons: [{
    id: 'search',
    svgContent: '<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>'
  }]
}
