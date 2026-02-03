// src/types.js
// This file contains shared JSDoc type definitions used across the core codebase.
// These are used by TypeScript to generate .d.ts files.

/**
 * A functional component type. Uses React types for better IDE support (compatible with Preact via aliasing).
 *
 * @typedef {import('react').ComponentType<any>} ComponentType
 */

/**
 * Configuration for how a button behaves at a specific breakpoint (mobile, tablet, desktop).
 *
 * @typedef {Object} ButtonBreakpointConfig
 *
 * @property {number} [order]
 * The order the button appears within its slot.
 *
 * @property {boolean} [showLabel]
 * Whether to a show label, if false then a tooltip is generated from the the label.
 *
 * @property {string} slot
 * The slot that the button should appear in at this breakpoint.
 */

/**
 * Configuration for how a control behaves at a specific breakpoint (mobile, tablet, desktop).
 *
 * @typedef {Object} ControlBreakpointConfig
 *
 * @property {string} slot
 * Slot identifier.
 */

/**
 * Configuration for how a panel behaves at a specific breakpoint (mobile, tablet, desktop).
 *
 * @typedef {Object} PanelBreakpointConfig
 *
 * @property {boolean} [dismissable]
 * Whether panel can be dismissed.
 *
 * @property {boolean} [exclusive]
 * Whether panel is exclusive. An exclusive panel will hide other panels when it is visible.
 *
 * @property {boolean} [initiallyOpen]
 * Whether panel is initially open.
 *
 * @property {boolean} [modal]
 * Whether panel is modal.
 *
 * @property {string} slot
 * Slot identifier.
 *
 * @property {string} [width]
 * Panel width.
 */

/**
 * Context object passed to plugin callbacks and components, providing access to config, state and services.
 *
 * @typedef {Object} PluginContext
 *
 * @property {Object} [appConfig]
 * Application configuration.
 *
 * @property {Object} [appState]
 * Application state.
 *
 * @property {Object} [iconRegistry]
 * Icon registry.
 *
 * @property {MapProvider} [mapProvider]
 * Map provider instance.
 *
 * @property {Object} [mapState]
 * Map state.
 *
 * @property {Object} [pluginConfig]
 * Plugin-specific configuration.
 *
 * @property {Object} [pluginState]
 * Plugin-specific state.
 *
 * @property {Object} [services]
 * Core services (announce, reverseGeocode, closeApp, etc.).
 */

/**
 * Defines a button that can be rendered in the UI at various breakpoints.
 *
 * @typedef {Object} ButtonDefinition
 *
 * @property {ButtonBreakpointConfig} [desktop]
 * Desktop breakpoint configuration.
 *
 * @property {(context: PluginContext) => boolean} [enableWhen]
 * Callback to determine if the button should be enabled. Sets aria-disabled accordingly.
 * Only evaluated for plugin-defined buttons; use toggleButtonState() for host buttons.
 *
 * @property {(context: PluginContext) => boolean} [excludeWhen]
 * Callback to determine if the button should be excluded from rendering.
 *
 * @property {string} [group]
 * Button group label for grouping related buttons.
 *
 * @property {(context: PluginContext) => boolean} [hiddenWhen]
 * Callback to determine if the button should be hidden. Sets display: none if true.
 * Only evaluated for plugin-defined buttons; use toggleButtonState() for host buttons.
 *
 * @property {string} [iconId]
 * Icon identifier from the icon registry.
 *
 * @property {string} [iconSvgContent]
 * Raw SVG content for the button icon. The SVG tag itself should be excluded.
 *
 * @property {string} id
 * Unique button identifier.
 *
 * @property {boolean} [inline=true]
 * Whether the button is rendered when the app is not in fullscreen mode.
 * Set to false to only show the button when fullscreen.
 *
 * @property {boolean} [isPressed]
 * Sets the button’s pressed state. When true or false, aria-pressed is added accordingly.
 * For host buttons added via addButton() as an alternative to pressedWhen.
 *
 * @property {string | (() => string)} label
 * Accesible label. Text or a function returning the text. Used for the label or tooltip if 'showLabel' is false.
 *
 * @property {ButtonBreakpointConfig} mobile
 * Mobile breakpoint configuration.
 *
 * @property {(event: MouseEvent, context: PluginContext) => void} [onClick]
 * Click handler for the button.
 *
 * @property {string} [panelId]
 * Associated panel identifier to toggle open when clicked.
 *
 * @property {(context: PluginContext) => boolean} [pressedWhen]
 * Callback to determine if the button should appear pressed. Sets aria-pressed accordingly.
 * Only evaluated for plugin-defined buttons; use toggleButtonState() for host buttons.
 *
 * @property {ButtonBreakpointConfig} tablet
 * Tablet breakpoint configuration.
 */

/**
 * Defines a custom control component that can be rendered in the UI at various breakpoints.
 *
 * @typedef {Object} ControlDefinition
 *
 * @property {string} id
 * Unique control identifier.
 *
 * @property {string} label
 * Accessible label for the control.
 *
 * @property {ComponentType} render
 * Render component.
 *
 * @property {ControlBreakpointConfig} mobile
 * Mobile breakpoint configuration.
 *
 * @property {ControlBreakpointConfig} tablet
 * Tablet breakpoint configuration.
 *
 * @property {ControlBreakpointConfig} desktop
 * Desktop breakpoint configuration.
 */

/**
 * Interface for map provider implementations that wrap underlying map libraries.
 *
 * @typedef {Object} MapProvider
 *
 * @property {any} map
 * Underlying map instance.
 *
 * @property {{ supportedShortcuts: string[], supportsMapSizes: boolean }} capabilities
 * Map provider capabilities.
 *
 * @property {(config: any) => Promise<void>} initMap
 * Initialize the map.
 *
 * @property {() => void} destroyMap
 * Destroy the map.
 *
 * @property {(options: { center?: [number, number], zoom?: number }) => void} setView
 * Set map view with optional center ([lng, lat] or [easting, northing] depending on the crs of the map provider) and zoom.
 *
 * @property {(delta: number) => void} zoomIn
 * Zoom in by delta.
 *
 * @property {(delta: number) => void} zoomOut
 * Zoom out by delta.
 *
 * @property {(offset: [number, number]) => void} panBy
 * Pan map by pixel offset [x, y]. Positive x pans right, positive y pans down.
 *
 * @property {(bounds: [number, number, number, number]) => void} fitToBounds
 * Fit map view to the specified bounds [west, south, east, north] or [minX, minY, maxX, maxY] depending on the crs of the map provider.
 *
 * @property {(padding: { top?: number, bottom?: number, left?: number, right?: number }) => void} setPadding
 * Set map padding as pixel insets from the top, bottom, left and right edges of the map.
 *
 * @property {() => [number, number]} getCenter
 * Get current center coordinates [lng, lat] or [easting, northing] depending on the crs of the map provider.
 *
 * @property {() => number} getZoom
 * Get current zoom level.
 *
 * @property {() => [number, number, number, number]} getBounds
 * Get current bounds as [west, south, east, north] or [minX, minY, maxX, maxY] depending on the crs of the map provider.
 *
 * @property {(point: { x: number, y: number }) => any[]} getFeaturesAtPoint
 * Query rendered features at a screen pixel position (x from left edge, y from top edge of viewport).
 *
 * @property {() => string} getAreaDimensions
 * Get the dimensions of the visible map area as a formatted string (e.g., '400m by 750m').
 *
 * @property {(from: [number, number], to: [number, number]) => string} getCardinalMove
 * Get cardinal direction and distance between two coordinates ([lng, lat] or [easting, northing] depending on the crs of the map provider). Returns a formatted string (e.g., 'north 400m' or 'south 400m, west 750m').
 *
 * @property {() => number} getResolution
 * Get map resolution in meters per pixel.
 *
 * @property {(coords: [number, number]) => { x: number, y: number }} mapToScreen
 * Convert map coordinates ([lng, lat] or [easting, northing] depending on the crs of the map provider) to screen pixel position (x from left edge, y from top edge of viewport).
 *
 * @property {(point: { x: number, y: number }) => [number, number]} screenToMap
 * Convert screen pixel position (x from left edge, y from top edge of viewport) to map coordinates ([lng, lat] or [easting, northing] depending on the crs of the map provider).
 *
 * @property {(selectedFeatures: any[], stylesMap: any) => any} [updateHighlightedFeatures]
 * @experimental Update highlighted features on the map.
 *
 * @property {(direction: string) => any} [highlightNextLabel]
 * @experimental Highlight the next label in the specified direction for keyboard navigation.
 *
 * @property {() => any} [highlightLabelAtCenter]
 * @experimental Highlight the label nearest to the map center.
 *
 * @property {() => void} [clearHighlightedLabel]
 * @experimental Clear any highlighted label.
 */

/**
 * Configuration options for a map provider.
 *
 * @typedef {Object} MapProviderConfig
 *
 * @property {'EPSG:4326' | 'EPSG:27700'} crs
 * Coordinate reference system.
 */

/**
 * Descriptor for lazy-loading a map provider.
 *
 * @typedef {Object} MapProviderDescriptor
 *
 * @property {() => { isSupported: boolean, error?: string }} checkDeviceCapabilities
 * Check if device is supported.
 *
 * @property {() => Promise<MapProviderLoadResult>} load
 * Load the map provider.
 */

/**
 * Result returned when a map provider is loaded.
 *
 * @typedef {Object} MapProviderLoadResult
 *
 * @property {new (options: any) => MapProvider} MapProvider
 * Map provider constructor.
 *
 * @property {MapProviderConfig} mapProviderConfig
 * Map provider configuration.
 *
 * @property {any} [mapFramework]
 * Underlying map framework.
 */

/**
 * Configuration for a map style (basemap appearance).
 *
 * @typedef {Object} MapStyleConfig
 *
 * @property {'light' | 'dark'} [appColorScheme]
 * App UI color scheme. Ensures that panels, buttons and controls use the appropriate colour scheme.
 *
 * @property {string} [attribution]
 * Attribution text.
 *
 * @property {string} [backgroundColor]
 * CSS background color. Allows the viewport background to matche the background layer of the style.
 *
 * @property {string} [id]
 * Unique identifier for the style.
 *
 * @property {string} [label]
 * Display label for the style.
 *
 * @property {string} [logo]
 * URL to logo image.
 *
 * @property {string} [logoAltText]
 * Alt text for logo.
 *
 * @property {'light' | 'dark'} [mapColorScheme]
 * Map color scheme. Used to determine the style of controls on the map. eg. Halo colours etc
 *
 * @property {string} [thumbnail]
 * URL to thumbnail image.
 *
 * @property {string} url
 * URL to the style.json (Mapbox Style Specification).
 */

/**
 * Configuration for a map marker.
 *
 * @typedef {Object} MarkerConfig
 *
 * @property {[number, number]} coords
 * Coordinates [lng, lat] or [x, y].
 *
 * @property {string} id
 * Unique marker identifier.
 *
 * @property {MarkerOptions} [options]
 * Optional marker appearance options.
 */

/**
 * Options for customizing marker appearance.
 *
 * @typedef {Object} MarkerOptions
 *
 * @property {string | Record<string, string>} [color]
 * Marker color or object with colors keyed by style ID.
 *
 * @property {string} [shape]
 * Marker shape (e.g., 'pin').
 */

/**
 * Defines a panel that can be rendered in the UI at various breakpoints.
 *
 * @typedef {Object} PanelDefinition
 *
 * @property {PanelBreakpointConfig} desktop
 * Desktop breakpoint configuration.
 *
 * @property {string} [html]
 * HTML content.
 *
 * @property {string} id
 * Panel identifier.
 *
 * @property {string} label
 * Accessible label. Used as the panel heading.
 *
 * @property {PanelBreakpointConfig} mobile
 * Mobile breakpoint configuration.
 *
 * @property {ComponentType} [render]
 * Render component.
 *
 * @property {boolean} [showLabel]
 * Whether to show the panel heading. The panel heading is visually hidden if false.
 *
 * @property {PanelBreakpointConfig} tablet
 * Tablet breakpoint configuration.
 */

/**
 * Descriptor for lazy-loading a plugin.
 *
 * @typedef {Object} PluginDescriptor
 *
 * @property {string} id
 * Unique plugin identifier.
 *
 * @property {() => Promise<PluginManifest>} load
 * Async loader.
 *
 * @property {Partial<PluginManifest>} [manifest]
 * Optional manifest overrides.
 */

/**
 * Definition for a custom icon that can be registered and used by buttons.
 *
 * @typedef {Object} IconDefinition
 *
 * @property {string} id
 * Unique icon identifier.
 *
 * @property {string} svgContent
 * Raw SVG content (without the outer SVG tag).
 */

/**
 * Manifest defining a plugin's buttons, panels, controls, API methods, and state.
 *
 * @typedef {Object} PluginManifest
 *
 * @property {Record<string, Function>} [api]
 * API methods.
 *
 * @property {ButtonDefinition[]} [buttons]
 * Button definitions.
 *
 * @property {ControlDefinition[]} [controls]
 * Control definitions.
 *
 * @property {IconDefinition[]} [icons]
 * Icon definitions.
 *
 * @property {ComponentType} [InitComponent]
 * Initialization component.
 *
 * @property {PanelDefinition[]} [panels]
 * Panel definitions.
 *
 * @property {{ initialState: Record<string, any>, actions: Record<string, Function> }} [reducer]
 * Reducer configuration.
 */

/**
 * Function that performs reverse geocoding to get an address from coordinates.
 *
 * @typedef {(url: string, transformRequest: TransformRequestFn | undefined, crs: string, zoom: number, coord: [number, number]) => Promise<string | null>} ReverseGeocodeFn
 */

/**
 * Descriptor for lazy-loading a reverse geocode provider.
 *
 * @typedef {Object} ReverseGeocodeProviderDescriptor
 *
 * @property {() => Promise<ReverseGeocodeFn>} load
 * Load reverse geocode function.
 *
 * @property {TransformRequestFn} [transformRequest]
 * Request transformer.
 *
 * @property {string} [url]
 * Provider URL.
 */

/**
 * Function to transform outgoing requests (e.g., to add authentication headers).
 *
 * @typedef {(request: Request) => Request | Promise<Request>} TransformRequestFn
 */

/**
 * Configuration options for the InteractiveMap constructor.
 *
 * Some properties (zoom, center, minZoom, maxZoom, bounds, extent) are passed
 * directly to the underlying map engine. See your map provider's documentation
 * for detailed behaviour.
 *
 * @typedef {Object} InteractiveMapConfig
 *
 * @property {'light' | 'dark'} [appColorScheme='light']
 * Application colour scheme.
 *
 * @property {boolean} [autoColorScheme=false]
 * Whether to automatically determine the colour scheme based on system preferences.
 *
 * @property {string} [backgroundColor='var(--background-color)']
 * Background color for the map container. A CSS color value.
 *
 * @property {'buttonFirst' | 'hybrid' | 'inline' | 'mapOnly'} [behaviour='buttonFirst']
 * Map interaction behaviour mode.
 *
 * @property {[number, number, number, number]} [bounds]
 * Initial bounds [west, south, east, north]. Equivalent to extent; use whichever matches your map provider's terminology.
 *
 * @property {string} [buttonClass='im-c-open-map-button']
 * CSS class applied to the 'Open map' button.
 *
 * @property {string} [buttonText='Map view']
 * Text content for the button used to open or toggle the map view.
 *
 * @property {[number, number]} [center]
 * Initial center [lng, lat] or [easting, northing] depending on the crs of the map provider.
 *
 * @property {string} [containerHeight='600px']
 * Height of the map container. Accepts any valid CSS height value (e.g. '640px', '40rem' or '100%').
 *
 * @property {string} [deviceNotSupportedText]
 * Message displayed when the user's device or browser does not support the component.
 *
 * @property {boolean} [enableFullscreen=false]
 * Whether a toggle fullscreen button is displayed.
 *
 * @property {boolean} [enableZoomControls=false]
 * Whether zoom control buttons are displayed.
 *
 * @property {[number, number, number, number]} [extent]
 * Initial extent [minX, minY, maxX, maxY]. Equivalent to bounds; use whichever matches your map provider's terminology.
 *
 * @property {string} [genericErrorText]
 * Fallback error message shown when the map fails to load.
 *
 * @property {boolean} [hasExitButton=false]
 * Whether an exit map button is displayed when the app is fullscreen.
 *
 * @property {number | null} [hybridWidth]
 * Optional breakpoint (in pixels) for hybrid behaviour. Defaults to 'maxMobileWidth' when not set.
 *
 * @property {string} [keyboardHintText]
 * HTML string providing keyboard shortcut instructions for accessibility users.
 *
 * @property {string} [mapLabel='Interactive map']
 * Accessible label for the map, announced by screen readers.
 *
 * @property {MapProviderDescriptor} [mapProvider]
 * A factory function that returns a map provider instance (e.g. maplibreProvider()).
 *
 * @property {'small' | 'medium' | 'large'} [mapSize='small']
 * Visual size variant of the map.
 *
 * @property {MapStyleConfig} [mapStyle]
 * Map style configuration.
 *
 * @property {string} [mapViewParamKey='mv']
 * URL query parameter key used to control map view state.
 *
 * @property {string | Record<string, string>} [markerColor='#ff0000']
 * Colour used for map markers. May be a single colour value or an object keyed by map style ID.
 *
 * @property {MarkerConfig[]} [markers]
 * Initial markers to display on the map.
 *
 * @property {string} [markerShape='pin']
 * Shape used for map markers.
 *
 * @property {[number, number, number, number]} [maxExtent]
 * Maximum viewable extent [west, south, east, north].
 *
 * @property {number} [maxMobileWidth=640]
 * Maximum viewport width (in pixels) considered to be a mobile device.
 *
 * @property {number} [maxZoom]
 * Maximum zoom level.
 *
 * @property {number} [minDesktopWidth=835]
 * Minimum viewport width (in pixels) considered to be a desktop device.
 *
 * @property {number} [minZoom]
 * Minimum zoom level.
 *
 * @property {number} [nudgePanDelta=5]
 * Smaller pan increment (in pixels) used for fine-grained panning.
 *
 * @property {number} [nudgeZoomDelta=0.1]
 * Smaller zoom increment used for fine-grained zoom adjustments.
 *
 * @property {string} [pageTitle='Map view']
 * Page title text used when the map is fullscreen.
 *
 * @property {number} [panDelta=100]
 * Distance (in pixels) to pan the map during standard pan interactions.
 *
 * @property {PluginDescriptor[]} [plugins]
 * Plugins to load.
 *
 * @property {boolean} [readMapText=false]
 * Whether map text labels can be selected and read aloud by assistive technologies.
 *
 * @property {ReverseGeocodeProviderDescriptor} [reverseGeocodeProvider]
 * A factory function that returns a reverse geocode provider instance.
 *
 * @property {TransformRequestFn} [transformRequest]
 * Request transformer for outgoing requests (e.g., to add authentication headers).
 *
 * @property {number} [zoom]
 * Initial zoom level.
 *
 * @property {number} [zoomDelta=1]
 * Amount to change zoom level for standard zoom interactions.
 */

export {}
