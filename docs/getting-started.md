# Getting started

## Installation

```shell
npm install @defra/interactive-map
```

This uses [MapLibre](https://maplibre.org) to draw the map, and installs it for you.

For a different map engine, install one of the alternatives instead. They work the same way and have the same imports, so only the package name changes.

| Package | Map engine | Use it for |
|---|---|---|
| `@defra/interactive-map` | MapLibre | Most services |
| `@defra/interactive-map-openlayers` | OpenLayers | Maps in British National Grid (EPSG:27700) |
| `@defra/interactive-map-esri` | Esri (ArcGIS) | Services that need the ArcGIS SDK. It has fewer features, needs a bundler, and doesn't support a strict Content Security Policy |

## GOV.UK Prototype Kit

The quickest way to get started is with the GOV.UK Prototype Kit. Install the package as a plugin, and the map is ready to use, with its scripts, styles and a map page template.

See [GOV.UK Prototype Kit - Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins).

## Setting up a map with a bundler

For bundlers, such as webpack or Vite, the package is provided as ES modules (ESM).

Add a container for the map to your HTML:

```html
<div id="map"></div>
```

Then create the map in your JavaScript:

```js
import InteractiveMap from '@defra/interactive-map'
import '@defra/interactive-map/css'

const interactiveMap = new InteractiveMap('map', {
  behaviour: 'hybrid',
  mapLabel: 'Ambleside',
  zoom: 14,
  center: [-2.968, 54.425],
  containerHeight: '650px',
  mapStyle: {
    url: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
    backgroundColor: '#f5f5f0'
  }
})
```

webpack and Vite need no extra setup.

With the Esri package, your bundler needs to handle CSS imports, as the ArcGIS SDK imports its own CSS. Most webpack and Vite setups already do. With Rollup, add a CSS plugin such as `rollup-plugin-postcss`.

### Rollup and esbuild

Rollup and esbuild don't bundle MapLibre's worker, so copy `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` to your assets and set its URL in [`mapProviderOptions`](./api.md#mapprovideroptions):

```js
mapProviderOptions: { workerUrl: '/your-assets-path/maplibre-gl-worker.mjs' }
```

## Setting up a map without a bundler

Without a bundler, the package is provided as Universal Module Definition (UMD) scripts, which you add to your page with `<script>` tags.

Copy these folders from the package to your assets:

- `dist/umd`, the map's scripts
- `dist/css`, the map's styles

Keep each folder's files together, as the map loads the rest of its scripts when it opens.

Then add the map to your page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My map</title>
  <link rel="stylesheet" href="/your-assets-path/interactive-map/css/index.css">
</head>
<body>
  <div id="map"></div>

  <script src="/your-assets-path/interactive-map/umd/index.js"></script>
  <script>
    const interactiveMap = new defra.InteractiveMap('map', {
      behaviour: 'hybrid',
      mapLabel: 'Ambleside',
      zoom: 14,
      center: [-2.968, 54.425],
      containerHeight: '650px',
      mapStyle: {
        url: 'https://tiles.openfreemap.org/styles/liberty',
        attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
        backgroundColor: '#f5f5f0'
      }
    })
  </script>
</body>
</html>
```

The Esri package can only be used with a bundler.

## Content Security Policy

`@defra/interactive-map` and `@defra/interactive-map-openlayers` work under a strict Content Security Policy (CSP). The Esri package doesn't.

Serve the map's files from your own site. For scripts, use either:

- `script-src 'self'`
- a nonce on each of the map's `<script>` tags. With a bundler, also add `'self'` or `'strict-dynamic'`, as the nonce can't be added to the files your bundle loads later. Without a bundler, the nonce is enough, as the map adds it to the files it loads.

With `script-src 'self'`, inline scripts are blocked, so move the code that creates the map, such as the inline script in [Setting up a map without a bundler](#setting-up-a-map-without-a-bundler), into its own file. With a nonce, add it to the inline script too.

The map also needs:

| Directive | Value |
|---|---|
| `worker-src` | `'self'`, for MapLibre's worker. Serve the worker from your own site |
| `style-src` | `'self'`. No inline styles are needed |
| `img-src` | `'self' data:`. `data:` is for symbols and fill patterns. With OpenLayers, also add the hosts of raster and WMS basemaps, and `blob:` if you use a `transformRequest` |
| `connect-src` | `'self'` and the hosts of your map styles, tiles and any services the map calls, such as search |

For example, for a MapLibre map using Ordnance Survey basemaps:

```
default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.os.uk
```

## Using plugins

Plugins add features to the map, such as datasets, drawing and search. They come with the package.

Some plugins have their own CSS. Each plugin's docs say if it does. The examples below add the datasets plugin, which has CSS.

### With a bundler

Import the plugin and its CSS, then pass the plugin in `plugins`:

```js
import InteractiveMap from '@defra/interactive-map'
import createDatasetsPlugin from '@defra/interactive-map/plugins/datasets'
import '@defra/interactive-map/css'
import '@defra/interactive-map/plugins/datasets/css'

const interactiveMap = new InteractiveMap('map', {
  // ...your other options
  plugins: [
    createDatasetsPlugin({
      datasets: [{
        id: 'my-parcels',
        label: 'My parcels',
        geojson: 'https://example.com/api/parcels'
      }]
    })
  ]
})
```

### Without a bundler

Copy the plugin's `plugins/datasets/dist/umd` and `plugins/datasets/dist/css` folders to your assets. Then add its stylesheet after the map's, and its script after the map's script:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My map</title>
  <link rel="stylesheet" href="/your-assets-path/interactive-map/css/index.css">
  <link rel="stylesheet" href="/your-assets-path/plugins/datasets/css/index.css">
</head>
<body>
  <div id="map"></div>

  <script src="/your-assets-path/interactive-map/umd/index.js"></script>
  <script src="/your-assets-path/plugins/datasets/umd/index.js"></script>
  <script>
    const interactiveMap = new defra.InteractiveMap('map', {
      // ...your other options
      plugins: [
        defra.datasetsPlugin({
          datasets: [{
            id: 'my-parcels',
            label: 'My parcels',
            geojson: 'https://example.com/api/parcels'
          }]
        })
      ]
    })
  </script>
</body>
</html>
```
