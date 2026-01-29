/**
 * Default configuration options for InteractiveMap.
 *
 * These values are used when no corresponding option is provided by the consumer.
 * They define map behaviour, layout, accessibility text, interaction settings,
 * and provider-related configuration.
 *
 * @type {Object}
 *
 * @property {string} appColorScheme
 * Application colour scheme.
 * Supported values include `'light'` or `'dark'`.
 *
 * @property {boolean} autoColorScheme
 * Whether to automatically determine the colour scheme based on system preferences.
 *
 * @property {string} backgroundColor
 * Background color for the map container. A CSS color value.
 *
 * @property {string} behaviour
 * Map interaction behaviour mode.
 * Supported values include `'buttonFirst'`, `'hybrid'`, `'inline'`, and `'mapOnly'`.
 *
 * @property {string} buttonClass
 * CSS class applied to the `Open map` button.
 *
 * @property {string} buttonText
 * Text content for the button used to open or toggle the map view.
 *
 * @property {string} containerHeight
 * Height of the map container.
 * Accepts any valid CSS width value (e.g. `'640px'`, `'40rem'`, `'100%'`).
 *
 * @property {string} deviceNotSupportedText
 * Message displayed when the user’s device or browser does not support the component.
 *
 * @property {boolean} enableFullscreen
 * Whether a toggle fullscreen button is displayed.
 *
 * @property {boolean} enableZoomControls
 * Whether zoom control buttons are displayed.
 *
 * @property {string} genericErrorText
 * Fallback error message shown when the map fails to load.
 *
 * @property {boolean} hasExitButton
 * Whether an exit map button is displayed when the app is fullscreen.
 *
 * @property {?number} hybridWidth
 * Optional breakpoint (in pixels) for hybrid behaviour.
 * Defaults to `maxMobileWidth` when not set.
 *
 * @property {string} keyboardHintText
 * HTML string providing keyboard shortcut instructions for accessibility users.
 *
 * @property {string} mapLabel
 * Accessible label for the map, announced by screen readers.
 *
 * @property {?Function} mapProvider
 * A factory function that returns a map provider instance (e.g. `maplibreProvider()`).
 *
 * @property {string} mapSize
 * Visual size variant of the map.
 * Supported values include `'small'`, `'medium'`, or `'large'`.
 *
 * @property {string} mapViewParamKey
 * URL query parameter key used to control map view state.
 *
 * @property {number} maxMobileWidth
 * Maximum viewport width (in pixels) considered to be a mobile device.
 *
 * @property {number} minDesktopWidth
 * Minimum viewport width (in pixels) considered to be a desktop device.
 *
 * @property {string|Object<string, string>} markerColor
 * Colour used for map markers.
 *
 * May be provided as:
 * - A single colour value applied to all map styles (e.g. `'#ff0000'`)
 * - An object keyed by map style ID, allowing different colours per style
 *
 * @example
 * markerColor: '#ff0000'
 *
 * @example
 * markerColor: {
 *   outdoor: '#ff0000',
 *   dark: '#ffffff'
 * }
 *
 * @property {string} markerShape
 * Shape used for map markers.
 *
 * @property {number} nudgePanDelta
 * Smaller pan increment used for fine-grained panning.
 *
 * @property {number} nudgeZoomDelta
 * Smaller zoom increment used for fine-grained zoom adjustments.
 *
 * @property {number} panDelta
 * Distance (in pixels) to pan the map during standard pan interactions.
 *
 * @property {string} pageTitle
 * Page title text used when the map is fullscreen.
 *
 * @property {boolean} readMapText
 * Whether map text labels can be selected and read aloud by assistive technologies.
 *
 * @property {?Function} reverseGeocodeProvider
 * A factory function that returns a reverse geocode provider instance (e.g. `openNamesProvider()`).
 *
 * @property {number} zoomDelta
 * Amount to change zoom level for standard zoom interactions.
 *
 * @experimental
 * This feature is experimental and may change or be removed in a future release.
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
