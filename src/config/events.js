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
  /** @internal Set a buttons state. Payload: { id, prop, value? } */
  APP_TOGGLE_BUTTON_STATE: 'app:togglebuttonstate',
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
   * Emitted when the map application has opened and is visible.
   *
   * Fired after initial load (`loadApp`) and when the app is shown again after being hidden (`showApp`).
   * Subscribe to this event to react whenever the map becomes visible to the user.
   *
   * Payload: `{ statePreserved: boolean }` — `true` if the map state was preserved from a previous session.
   *
   * @example
   * map.on(EVENTS.APP_OPENED, ({ statePreserved }) => {
   *   console.log('Map opened, state preserved:', statePreserved)
   * })
   */
  APP_OPENED: 'app:opened',

  /**
   * Emitted when the map application has closed and is no longer visible.
   *
   * Fired when the app is hidden (`hideApp`) or removed (`removeApp`).
   * Subscribe to this event to react whenever the map is closed.
   *
   * Payload: `{ statePreserved: boolean }` — `true` if the map state was preserved (i.e. can be restored).
   *
   * @example
   * map.on(EVENTS.APP_CLOSED, ({ statePreserved }) => {
   *   console.log('Map closed, state preserved:', statePreserved)
   * })
   */
  APP_CLOSED: 'app:closed',

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

  /** @internal Set map style. Payload: MapStyleConfig */
  MAP_SET_STYLE: 'map:setstyle',
  /** @internal Set map size. Payload: { width, height } */
  MAP_SET_SIZE: 'map:setsize',
  /** @internal Set pixel ratio. Payload: pixelRatio */
  MAP_SET_PIXEL_RATIO: 'map:setpixelratio',
  /** @internal Fit the map to a bounding box. Payload: [west, south, east, north] */
  MAP_FIT_TO_BOUNDS: 'map:fittobounds',
  /** @internal Set the map center and zoom. Payload: { center: [number, number], zoom?: number } */
  MAP_SET_VIEW: 'map:setview',

  // ============================================
  // Map responses (advanced / subscribe)
  // ============================================

  /** @internal Emitted when map styles are initialized. */
  MAP_INIT_MAP_STYLES: 'map:initmapstyles',

  /**
   * Emitted when the map style has finished loading.
   * Payload: `{ mapStyleId: string }`
   *
   * @example
   * map.on(EVENTS.MAP_STYLE_CHANGE, ({ mapStyleId }) => {
   *   console.log('Style changed to', mapStyleId)
   * })
   */
  MAP_STYLE_CHANGE: 'map:stylechange',

  /** Emitted when the map has fully loaded. */
  MAP_LOADED: 'map:loaded',

  /**
   * Emitted when the map is ready for interaction and initial app state is settled.
   *
   * Payload:
   * - `map` — the underlying map instance
   * - `view` — the map view (ESRI SDK only)
   * - `crs` — coordinate reference system string (e.g. `'EPSG:4326'`)
   * - `mapStyleId` — the ID of the active map style (e.g. `'outdoor'`, `'dark'`)
   * - `mapSize` — the active map size string (e.g. `'small'`, `'medium'`, `'large'`)
   *
   * @example
   * map.on(EVENTS.MAP_READY, ({ map, mapStyleId, mapSize }) => {
   *   console.log('Map ready, style:', mapStyleId, 'size:', mapSize)
   * })
   */
  MAP_READY: 'map:ready',

  /**
   * Emitted when the map size changes.
   * Payload: `{ mapSize: string }`
   *
   * @example
   * map.on(EVENTS.MAP_SIZE_CHANGE, ({ mapSize }) => {
   *   console.log('Map size changed to', mapSize)
   * })
   */
  MAP_SIZE_CHANGE: 'map:sizechange',

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

  /** Emitted when the map is destroyed. Payload: { mapId: string } */
  MAP_DESTROY: 'map:destroy'
}
