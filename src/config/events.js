export const EVENTS = {
  // App commands
  APP_ADD_MARKER: 'app:addmarker',
  APP_REMOVE_MARKER: 'app:removemarker',
  APP_SET_MODE: 'app:setmode',
  APP_REVERT_MODE: 'app:revertmode',
  APP_ADD_BUTTON: 'app:addbutton',
  APP_ADD_PANEL: 'app:addpanel',
  APP_REMOVE_PANEL: 'app:removepanel',
  APP_SHOW_PANEL: 'app:showpanel',
  APP_HIDE_PANEL: 'app:hidepanel',
  APP_ADD_CONTROL: 'app:addcontrol',

  // App responses
  APP_READY: 'app:ready',
  APP_PANEL_OPENED: 'app:panelopened',
  APP_PANEL_CLOSED: 'app:panelclosed',

  // Map commands
  MAP_SET_STYLE: 'map:setstyle',
  MAP_SET_SIZE: 'map:setsize',
  MAP_SET_PIXEL_RATIO: 'map:setpixelratio',

  // Map responses
  MAP_INIT_MAP_STYLES: 'map:initmapstyles',
  MAP_STYLE_CHANGE: 'map:stylechange',
  MAP_LOADED: 'map:loaded',
  MAP_READY: 'map:ready',
  MAP_FIRST_IDLE: 'map:firstidle',
  MAP_MOVE_START: 'map:movestart',
  MAP_MOVE: 'map:move',
  MAP_MOVE_END: 'map:moveend',
  MAP_STATE_UPDATED: 'map:stateupdated',
  MAP_DATA_CHANGE: 'map:datachange',
  MAP_RENDER: 'map:render',
  MAP_CLICK: 'map:click',
  MAP_EXIT: 'map:exit',
  MAP_DESTROY: 'map:destroy'
}
