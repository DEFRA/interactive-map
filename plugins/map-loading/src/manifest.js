// /plugins/map-loading/manifest.js
import { MapLoadingInit } from './MapLoadingInit.jsx'

// The overlay lives outside the mounted app, so the manifest is intentionally
// minimal - it exists to wire app lifecycle events into the overlay controller
export const manifest = {
  InitComponent: MapLoadingInit
}
