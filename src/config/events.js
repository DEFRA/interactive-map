/**
 * Map event constants.
 * Use these with `map.on()` and `map.off()` to subscribe to events.
 * 
 * @example
 * ```js
 * import InteractiveMap, { EVENTS } from '@defra/interactive-map'
 * 
 * map.on(EVENTS.MAP_READY, () => console.log('Ready!'))
 * map.on(EVENTS.MAP_CLICK, (e) => console.log(e.coordinates))
 * ```
 */
export const EVENTS = /** @type {const} */ ({
  // App commands (emit to trigger actions)
  /** Emit to add a marker */
  APP_ADD_MARKER: 'app:addmarker',
  /** Emit to remove a marker */
  APP_REMOVE_MARKER: 'app:removemarker',
  /** Emit to set interaction mode */
  APP_SET_MODE: 'app:setmode',
  /** Emit to revert to previous mode */
  APP_REVERT_MODE: 'app:revertmode',
  /** Emit to add a button */
  APP_ADD_BUTTON: 'app:addbutton',
  /** Emit to add a panel */
  APP_ADD_PANEL: 'app:addpanel',
  /** Emit to remove a panel */
  APP_REMOVE_PANEL: 'app:removepanel',
  /** Emit to show a panel */
  APP_SHOW_PANEL: 'app:showpanel',
  /** Emit to hide a panel */
  APP_HIDE_PANEL: 'app:hidepanel',
  /** Emit to add a control */
  APP_ADD_CONTROL: 'app:addcontrol',

  // App responses (subscribe to receive)
  /** Fired when app is fully initialized */
  APP_READY: 'app:ready',
  /** Fired when a panel is opened */
  APP_PANEL_OPENED: 'app:panelopened',
  /** Fired when a panel is closed */
  APP_PANEL_CLOSED: 'app:panelclosed',

  // Map commands
  /** Emit to change map style */
  MAP_SET_STYLE: 'map:setstyle',
  /** Emit to change map size */
  MAP_SET_SIZE: 'map:setsize',
  /** Emit to change pixel ratio */
  MAP_SET_PIXEL_RATIO: 'map:setpixelratio',

  // Map responses
  /** Fired when map styles are initialized */
  MAP_INIT_MAP_STYLES: 'map:initmapstyles',
  /** Fired when map style changes */
  MAP_STYLE_CHANGE: 'map:stylechange',
  /** Fired when map is loaded */
  MAP_LOADED: 'map:loaded',
  /** Fired when map is ready for interaction */
  MAP_READY: 'map:ready',
  /** Fired on first idle after load */
  MAP_FIRST_IDLE: 'map:firstidle',
  /** Fired when map starts moving */
  MAP_MOVE_START: 'map:movestart',
  /** Fired during map movement */
  MAP_MOVE: 'map:move',
  /** Fired when map stops moving */
  MAP_MOVE_END: 'map:moveend',
  /** Fired when map state updates */
  MAP_STATE_UPDATED: 'map:stateupdated',
  /** Fired when map data changes */
  MAP_DATA_CHANGE: 'map:datachange',
  /** Fired on each render frame */
  MAP_RENDER: 'map:render',
  /** Fired on map click */
  MAP_CLICK: 'map:click',
  /** Fired when exiting map */
  MAP_EXIT: 'map:exit',
  /** Fired when map is destroyed */
  MAP_DESTROY: 'map:destroy'
})

/**
 * @typedef {typeof EVENTS} EventsType
 * @typedef {EventsType[keyof EventsType]} EventName
 */
