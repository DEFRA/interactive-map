// /plugins/search/manifest.js
import { initialState, actions } from './reducer.js'
import { Search } from './Search.jsx'

export const manifest = {
  reducer: {
    initialState,
    actions
  },

  // The open trigger is a standard MapButton so it inherits the shared tooltip
  // (shown whenever its label is hidden). It toggles the plugin's own `isExpanded`
  // state, which the `search` control below reads to reveal the form.
  buttons: [{
    id: 'search',
    label: 'Search',
    iconId: 'search',
    // aria-controls the form rendered by the control (matches the form's id in Form.jsx)
    ariaControls: ({ appConfig }) => `${appConfig.id}-search-form`,
    // No trigger in default-expanded mode — the form is always visible there
    excludeWhen: ({ pluginConfig }) => Boolean(pluginConfig.expanded),
    // Keep focus in the search (the control focuses the input on open) rather than
    // letting the button return focus to the map viewport after the click.
    // NB: the trigger is hidden while the form is open via the `im-o-app--exclusive-control`
    // CSS (opacity + out-of-flow) rather than `hiddenWhen`, so it stays focusable and
    // focus can be returned to it on close without a display:none race.
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
      slot: 'top-right'
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
