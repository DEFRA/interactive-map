/**
 * Event constants for the Interactive Map event bus.
 *
 * Events are grouped into:
 * - **App commands**: Internal use, but may be used by plugin authors.
 * - **App responses**: Subscribe to these with `on()` to react to app state changes.
 * - **Map commands**: Internal use, but may be used by plugin authors.
 * - **Map responses**: Subscribe to these with `on()` to react to map state changes.
 *
 * @example
 * // Subscribe to app ready event
 * map.on(EVENTS.APP_READY, () => {
 *   console.log('Map is ready!')
 * })
 *
 * // Subscribe to panel events
 * map.on(EVENTS.APP_PANEL_OPENED, ({ panelId }) => {
 *   console.log('Panel opened:', panelId)
 * })
 */
export const EVENTS = {
  // ============================================
  // App commands (internal / plugin authors)
  // ============================================

  /** @internal Add a marker. Payload: { id, coords, options } */
  APP_ADD_MARKER: 'app:addmarker',
  /** @internal Remove a marker. Payload: id */
  APP_REMOVE_MARKER: 'app:removemarker',
  /** @internal Set application mode. Payload: mode */
  APP_SET_MODE: 'app:setmode',
  /** @internal Revert to previous mode. */
  APP_REVERT_MODE: 'app:revertmode',
  /** @internal Add a button. Payload: { id, config } */
  APP_ADD_BUTTON: 'app:addbutton',
  /** @internal Add a panel. Payload: { id, config } */
  APP_ADD_PANEL: 'app:addpanel',
  /** @internal Remove a panel. Payload: id */
  APP_REMOVE_PANEL: 'app:removepanel',
  /** @internal Show a panel. Payload: id */
  APP_SHOW_PANEL: 'app:showpanel',
  /** @internal Hide a panel. Payload: id */
  APP_HIDE_PANEL: 'app:hidepanel',
  /** @internal Add a control. Payload: { id, config } */
  APP_ADD_CONTROL: 'app:addcontrol',

  // ============================================
  // App responses (end-user / subscribe)
  // ============================================

  /**
   * Emitted when the app is fully initialized and ready for interaction.
   * Use this to perform actions that require the map to be available.
   *
   * @example
   * map.on(EVENTS.APP_READY, () => {
   *   map.addMarker('home', [-0.1276, 51.5074])
   * })
   */
  APP_READY: 'app:ready',

  /**
   * Emitted when a panel is opened.
   * Payload: { panelId: string }
   *
   * @example
   * map.on(EVENTS.APP_PANEL_OPENED, ({ panelId }) => {
   *   console.log('Panel opened:', panelId)
   * })
   */
  APP_PANEL_OPENED: 'app:panelopened',

  /**
   * Emitted when a panel is closed.
   * Payload: { panelId: string }
   *
   * @example
   * map.on(EVENTS.APP_PANEL_CLOSED, ({ panelId }) => {
   *   console.log('Panel closed:', panelId)
   * })
   */
  APP_PANEL_CLOSED: 'app:panelclosed',

  // ============================================
  // Map commands (internal / plugin authors)
  // ============================================

  /** @internal Set map style. Payload: styleId */
  MAP_SET_STYLE: 'map:setstyle',
  /** @internal Set map size. Payload: { width, height } */
  MAP_SET_SIZE: 'map:setsize',
  /** @internal Set pixel ratio. Payload: pixelRatio */
  MAP_SET_PIXEL_RATIO: 'map:setpixelratio',

  // ============================================
  // Map responses (advanced / subscribe)
  // ============================================

  /** @internal Emitted when map styles are initialized. */
  MAP_INIT_MAP_STYLES: 'map:initmapstyles',

  /** Emitted when the map style changes. Payload: { styleId: string } */
  MAP_STYLE_CHANGE: 'map:stylechange',

  /** Emitted when the map style has fully loaded. */
  MAP_LOADED: 'map:loaded',

  /** Emitted when the map is ready for interaction. Payload: { map } */
  MAP_READY: 'map:ready',

  /** Emitted once after the map first becomes idle following initial load. */
  MAP_FIRST_IDLE: 'map:firstidle',

  /** Emitted when map movement starts (pan, zoom, or rotation). */
  MAP_MOVE_START: 'map:movestart',

  /** Emitted continuously during map movement. Payload: { center, zoom, bounds, resolution } */
  MAP_MOVE: 'map:move',

  /** Emitted when map movement ends. Payload: { center, zoom, bounds, resolution } */
  MAP_MOVE_END: 'map:moveend',

  /** Emitted when map state is updated. Payload: { center, zoom, bounds, resolution } */
  MAP_STATE_UPDATED: 'map:stateupdated',

  /** Emitted when map data (tiles, features) changes. */
  MAP_DATA_CHANGE: 'map:datachange',

  /** Emitted on each map render frame. Use sparingly as this fires frequently. */
  MAP_RENDER: 'map:render',

  /**
   * Emitted when the map is clicked.
   * Payload: { coords: [number, number], point: { x, y }, features: any[] }
   */
  MAP_CLICK: 'map:click',

  /** Emitted when the user exits the map (e.g., via the close button). */
  MAP_EXIT: 'map:exit',

  /** Emitted when the map is destroyed. Payload: { mapId: string } */
  MAP_DESTROY: 'map:destroy'
}
