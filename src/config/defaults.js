/**
 * Default configuration options for InteractiveMap.
 *
 * These values are used when no corresponding option is provided by the consumer.
 * See {@link InteractiveMapConfig} in types.js for full property documentation.
 *
 * @type {Partial<import('../types.js').InteractiveMapConfig>}
 */
const defaults = {
  appColorScheme: 'light',
  autoColorScheme: false,
  backgroundColor: 'var(--background-color)',
  behaviour: 'buttonFirst',
  buttonClass: 'im-c-open-map-button',
  buttonText: 'Map view',
  containerHeight: '600px',
  deviceNotSupportedText: 'Your device is not supported. A map is available with a more up-to-date browser or device.',
  enableFullscreen: false,
  enableZoomControls: false,
  genericErrorText: 'There was a problem loading the map. Please try again later.',
  hasExitButton: false,
  hybridWidth: null, // Defaults to maxMobileWidth if not set
  keyboardHintText: '<span class="im-u-visually-hidden">Press </span><kbd>Alt</kbd> + <kbd>K</kbd> <span class="im-u-visually-hidden">to view </span>keyboard shortcuts',
  mapLabel: 'Interactive map',
  mapProvider: null,
  mapSize: 'small',
  mapViewParamKey: 'mv',
  maxMobileWidth: 640,
  minDesktopWidth: 835,
  markerColor: '#ff0000',
  markerShape: 'pin',
  nudgePanDelta: 5,
  nudgeZoomDelta: 0.1,
  panDelta: 100,
  pageTitle: 'Map view',
  readMapText: false,
  reverseGeocodeProvider: null,
  zoomDelta: 1
}

export default defaults
