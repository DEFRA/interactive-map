// /plugins/search/manifest.js
import { initialState, actions } from './reducer.js'
import { Search } from './Search.jsx'

export const manifest = {
  reducer: {
    initialState,
    actions
  },

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
