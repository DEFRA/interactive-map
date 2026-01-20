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
