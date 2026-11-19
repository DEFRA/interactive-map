# Upgrading to v1

In v1, each map engine has its own package, and the package sets up the map engine for you. You no longer pass a map provider or tell your bundler to ignore the engines you don't use.

## 1. Change package if you use OpenLayers or Esri

`@defra/interactive-map` now uses MapLibre only. If you use another engine, install its package instead:

| You used | Install |
|---|---|
| `maplibreProvider` | `@defra/interactive-map` |
| `openLayersProvider` | `@defra/interactive-map-openlayers` |
| `esriProvider` | `@defra/interactive-map-esri` |

Each package installs its own map engine, so you no longer need to install `ol`, `proj4` or `@arcgis/core` yourself. The Esri package can only be used with a bundler.

## 2. With a bundler

### Change your imports

All three packages have the same imports, so only the package name changes. For example:

```js
// Before
import createDatasetsPlugin from '@defra/interactive-map/plugins/datasets'

// After, with OpenLayers
import createDatasetsPlugin from '@defra/interactive-map-openlayers/plugins/datasets'
```

With Esri, the draw plugin has moved from `plugins/draw-es` to `plugins/draw`. The provider's CSS is now part of `@defra/interactive-map-esri/css`, so remove the `providers/esri/css` import.

### Remove the map provider

Remove the provider import and the `mapProvider` option. If you passed settings to the provider, pass them in [`mapProviderOptions`](./api.md#mapprovideroptions) instead:

```js
// Before
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'

const interactiveMap = new InteractiveMap('map', {
  mapProvider: maplibreProvider({ workerUrl: '/your-assets-path/maplibre-gl-worker.mjs' })
})

// After
import InteractiveMap from '@defra/interactive-map'

const interactiveMap = new InteractiveMap('map', {
  mapProviderOptions: { workerUrl: '/your-assets-path/maplibre-gl-worker.mjs' }
})
```

### Remove the engine ignore rules from your bundler config

Remove the config that told your bundler to ignore the map engines you don't use, such as webpack's `IgnorePlugin` or the `external` option in Vite, Rollup or esbuild. Each package only includes its own engine, so it's no longer needed.

The MapLibre worker setup for Rollup and esbuild hasn't changed. See [Rollup and esbuild](./getting-started.md#rollup-and-esbuild).

## 3. Without a bundler

### Copy the new scripts and CSS

Replace the map's and plugins' scripts and CSS in your assets with the ones from your v1 package. With OpenLayers, copy them from `@defra/interactive-map-openlayers`. Keep each folder's files together, as the map loads the rest of its scripts when it opens.

### Remove the map provider

Remove the provider's `<script>` tag, and its folder from your assets. Then remove the `mapProvider` option:

```html
<!-- Before -->
<script defer src="/your-assets-path/interactive-map/index.js"></script>
<script defer src="/your-assets-path/maplibre-provider/index.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const interactiveMap = new defra.InteractiveMap('map', {
      mapProvider: defra.maplibreProvider(),
      // ...your other options
    })
  })
</script>

<!-- After -->
<script defer src="/your-assets-path/interactive-map/index.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const interactiveMap = new defra.InteractiveMap('map', {
      // ...your other options
    })
  })
</script>
```

If you passed settings to the provider, such as `zoomAlignment` with OpenLayers, pass them in [`mapProviderOptions`](./api.md#mapprovideroptions) instead:

```js
// Before
mapProvider: defra.openLayersProvider({ zoomAlignment: 'world' })

// After
mapProviderOptions: { zoomAlignment: 'world' }
```
