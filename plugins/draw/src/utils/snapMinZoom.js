import { SNAP_ZOOM_IN_HINT_TEXT } from '../defaults.js'

/** Whether the map is zoomed out below snapMinZoom, so snapping isn't available */
export const isBelowSnapMinZoom = (pluginConfig, zoom) =>
  typeof pluginConfig?.snapMinZoom === 'number' && typeof zoom === 'number' && zoom < pluginConfig.snapMinZoom

/** The hint telling the user to zoom in to use snap */
export const getSnapHintText = (pluginConfig) => pluginConfig?.snapZoomInHintText ?? SNAP_ZOOM_IN_HINT_TEXT
