// src/types.js
// This file contains shared JSDoc type definitions used across the codebase.
// These are used by TypeScript to generate .d.ts files.

/**
 * @typedef {Object} MapStyleConfig
 * @property {string} [id] - Unique identifier for the style
 * @property {string} [label] - Display label for the style
 * @property {string} url - URL to the style specification
 * @property {string} [thumbnail] - URL to thumbnail image
 * @property {string} [logo] - URL to logo image
 * @property {string} [logoAltText] - Alt text for logo
 * @property {string} [attribution] - Attribution text
 * @property {string} [backgroundColor] - CSS background color
 * @property {'light' | 'dark'} [mapColorScheme] - Map color scheme
 * @property {'light' | 'dark'} [appColorScheme] - App UI color scheme
 */

/**
 * @typedef {Object} MarkerConfig
 * @property {string} id - Unique marker identifier
 * @property {[number, number]} coords - Coordinates [lng, lat] or [x, y]
 * @property {string | Record<string, string>} [color] - Marker color or color per style ID
 */

/**
 * @typedef {Object} MarkerOptions
 * @property {string | Record<string, string>} [color] - Marker color
 * @property {string} [shape] - Marker shape (e.g., 'pin')
 */

/**
 * @typedef {Object} MapProviderDescriptor
 * @property {() => { isSupported: boolean, error?: string }} checkDeviceCapabilities
 * @property {() => Promise<MapProviderLoadResult>} load
 */

/**
 * @typedef {Object} MapProviderLoadResult
 * @property {new (options: any) => MapProvider} MapProvider
 * @property {MapProviderConfig} mapProviderConfig
 * @property {any} [mapFramework]
 */

/**
 * @typedef {Object} MapProviderConfig
 * @property {'EPSG:4326' | 'EPSG:27700'} crs - Coordinate reference system
 */

/**
 * @typedef {Object} MapProvider
 * @property {any} map - Underlying map instance
 * @property {{ supportedShortcuts: string[], supportsMapSizes: boolean }} capabilities
 * @property {(config: any) => Promise<void>} initMap
 * @property {() => void} destroyMap
 * @property {(options: { center?: [number, number], zoom?: number }) => void} setView
 * @property {(delta: number) => void} zoomIn
 * @property {(delta: number) => void} zoomOut
 * @property {() => [number, number]} getCenter
 * @property {() => number} getZoom
 * @property {() => [number, number, number, number]} getBounds
 */

/**
 * @typedef {Object} ReverseGeocodeProviderDescriptor
 * @property {string} [url]
 * @property {TransformRequestFn} [transformRequest]
 * @property {() => Promise<ReverseGeocodeFn>} load
 */

/**
 * @typedef {(request: Request) => Request | Promise<Request>} TransformRequestFn
 */

/**
 * @typedef {(url: string, transformRequest: TransformRequestFn | undefined, crs: string, zoom: number, coord: [number, number]) => Promise<string | null>} ReverseGeocodeFn
 */

/**
 * @typedef {Object} PluginDescriptor
 * @property {string} id - Unique plugin identifier
 * @property {() => Promise<PluginManifest>} load - Async loader
 * @property {Partial<PluginManifest>} [manifest] - Optional manifest overrides
 */

/**
 * @typedef {Object} PluginManifest
 * @property {import('preact').ComponentType} [InitComponent]
 * @property {{ initialState: Record<string, any>, actions: Record<string, Function> }} [reducer]
 * @property {ButtonDefinition[]} [buttons]
 * @property {PanelDefinition[]} [panels]
 * @property {ControlDefinition[]} [controls]
 * @property {Record<string, Function>} [api]
 */

/**
 * @typedef {Object} SlotConfig
 * @property {string} slot - Slot identifier
 * @property {boolean} [showLabel]
 * @property {number} [order]
 * @property {string} [width]
 */

/**
 * @typedef {Object} ButtonDefinition
 * @property {string} id
 * @property {string | (() => string)} label
 * @property {string} [iconId]
 * @property {string} [panelId]
 * @property {string} [group]
 * @property {SlotConfig} mobile
 * @property {SlotConfig} tablet
 * @property {SlotConfig} desktop
 * @property {(context: any) => boolean} [excludeWhen]
 * @property {(context: any) => boolean} [hiddenWhen]
 * @property {(context: any) => boolean} [enableWhen]
 * @property {(event: MouseEvent, context: any) => void} [onClick]
 */

/**
 * @typedef {Object} PanelSlotConfig
 * @property {string} slot
 * @property {boolean} [initiallyOpen]
 * @property {boolean} [dismissable]
 * @property {boolean} [modal]
 * @property {boolean} [exclusive]
 * @property {string} [width]
 */

/**
 * @typedef {Object} PanelDefinition
 * @property {string} id
 * @property {string} label
 * @property {boolean} [showLabel]
 * @property {import('preact').ComponentType} [render]
 * @property {string} [html]
 * @property {PanelSlotConfig} mobile
 * @property {PanelSlotConfig} tablet
 * @property {PanelSlotConfig} desktop
 */

/**
 * @typedef {Object} ControlDefinition
 * @property {string} id
 * @property {string} label
 * @property {import('preact').ComponentType} render
 * @property {{ slot: string }} mobile
 * @property {{ slot: string }} tablet
 * @property {{ slot: string }} desktop
 */

export {}
