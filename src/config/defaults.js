/**
 * @typedef {Object} InteractiveMapConfig
 * @property {string} [mapViewParamKey='mv'] - URL parameter key for map view state
 * @property {'buttonFirst' | 'hybrid' | 'inline'} [behaviour='buttonFirst'] - How map integrates with page
 * @property {number} [maxMobileWidth=640] - Max width (px) for mobile layout
 * @property {number} [minDesktopWidth=835] - Min width (px) for desktop layout
 * @property {number | null} [hybridWidth] - Width for hybrid behaviour switch
 * @property {string} [containerHeight='600px'] - CSS height for map container
 * @property {string} [backgroundColor] - CSS background color
 * @property {'small' | 'medium' | 'large'} [mapSize='small'] - Preset map size
 * @property {'light' | 'dark'} [appColorScheme='light'] - App color scheme
 * @property {boolean} [autoColorScheme=false] - Auto-detect system color scheme
 * @property {string} [mapLabel='Interactive map'] - Accessible label
 * @property {string} [buttonText='Map view'] - Open button text
 * @property {string} [buttonClass='im-c-open-map-button'] - Open button CSS class
 * @property {string} [deviceNotSupportedText] - Unsupported device message
 * @property {string} [genericErrorText] - Generic error message
 * @property {string} [keyboardHintText] - Keyboard hint message
 * @property {string} [pageTitle='Map view'] - Fullscreen page title
 * @property {number} [zoomDelta=1] - Zoom button increment
 * @property {number} [nudgeZoomDelta=0.1] - Keyboard zoom increment
 * @property {number} [panDelta=100] - Keyboard pan distance (px)
 * @property {number} [nudgePanDelta=5] - Fine pan distance (px)
 * @property {boolean} [enableFullscreen=false] - Enable fullscreen mode
 * @property {boolean} [enableZoomControls=false] - Show zoom controls
 * @property {boolean} [hasExitButton] - Show exit button
 * @property {boolean} [readMapText=true] - Enable screen reader text
 * @property {[number, number]} [center] - Initial center [lng, lat]
 * @property {number} [zoom] - Initial zoom level
 * @property {[number, number, number, number]} [bounds] - Initial bounds
 * @property {[number, number, number, number]} [extent] - Alias for bounds
 * @property {number} [minZoom] - Minimum zoom level
 * @property {number} [maxZoom] - Maximum zoom level
 * @property {[number, number, number, number]} [maxExtent] - Maximum viewable extent
 * @property {import('../types.js').MarkerConfig[]} [markers] - Initial markers
 * @property {string} [markerShape='pin'] - Default marker shape
 * @property {string} [markerColor='#ff0000'] - Default marker color
 * @property {import('../types.js').MapProviderDescriptor} mapProvider - Map provider (required)
 * @property {import('../types.js').ReverseGeocodeProviderDescriptor} [reverseGeocodeProvider]
 * @property {import('../types.js').MapStyleConfig} [mapStyle] - Map style config
 * @property {import('../types.js').PluginDescriptor[]} [plugins] - Plugins to load
 * @property {import('../types.js').TransformRequestFn} [transformRequest] - Request transformer
 */

/** @type {InteractiveMapConfig} */
const defaults = {
  mapViewParamKey: 'mv',
  behaviour: 'buttonFirst',
  backgroundColor: 'var(--background-color)',
  maxMobileWidth: 640,
  minDesktopWidth: 835,
  hybridWidth: null, // Defaults to maxMobileWidth if not set
  containerHeight: '600px',
  mapSize: 'small',
  appColorScheme: 'light',
  autoColorScheme: false,
  mapLabel: 'Interactive map',
  buttonText: 'Map view',
  buttonClass: 'im-c-open-map-button',
  deviceNotSupportedText: 'Your device is not supported. A map is available with a more up-to-date browser or device.',
  genericErrorText: 'There was a problem loading the map. Please try again later.',
  keyboardHintText: '<span class="im-u-visually-hidden">Press </span><kbd>Alt</kbd> + <kbd>K</kbd> <span class="im-u-visually-hidden">to view </span>keyboard shortcuts',
  pageTitle: 'Map view',
  zoomDelta: 1,
  nudgeZoomDelta: 0.1,
  panDelta: 100,
  nudgePanDelta: 5,
  mapProvider: null,
  reverseGeocode: null,
  markerShape: 'pin',
  markerColor: '#ff0000',
  enableFullscreen: false,
  enableZoomControls: false,
  readMapText: true
}

export default defaults
