# Getting started

## Installation

```shell
npm install @defra/interactive-map@x.y.z-alpha
```

> [!NOTE]
Install using a fixed version (e.g. `npm install @defra/interactive-map@x.y.z-alpha`) as this package is currently in alpha and may introduce breaking changes. Check the GitHub releases page for the latest available [version](https://github.com/DEFRA/interactive-map/tags).

## GOV.UK Prototype kit

The quickest way to get started is via the GOV.UK Prototype Kit. Once installed, the map component is available immediately — no build step or manual asset setup required.

The plugin automatically serves the required scripts and styles, and provides a ready-made map page template to build from.

See [GOV.UK Prototype Kit - Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins) for how to install plugins.

## Manual setup

The package is distributed in two formats:

- **ESM** (ECMAScript Modules) — for projects using a bundler such as Webpack or Rollup. Import directly from the package in your JavaScript.
- **UMD** (Universal Module Definition) — for projects without a bundler. Copy the built files to your assets and load them via `<script>` tags.

The map component also requires a **map provider** — a separate library that handles the underlying tile rendering engine. The provider is passed in at initialisation, which keeps the core package lean and lets you choose the engine that fits your needs.

### MapLibre provider (recommended)

**ESM:** `maplibre-gl` is a peer dependency, install it separately:

```shell
npm install maplibre-gl
```

**UMD:** `maplibre-gl` is bundled — no separate install needed.

### ESRI provider (optional)

The ESRI provider is available for ESM projects only. Install `@arcgis/core` separately:

```shell
npm install @arcgis/core
```

## Basic usage

**ESM** — add a container element to your HTML and initialise the map in your JavaScript:

```html
<div id="map"></div>
```

```js
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'

import '@defra/interactive-map/css'

const interactiveMap = new InteractiveMap('map', {
  mapProvider: maplibreProvider(),
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

**UMD** — copy the `dist/umd/` folders to your assets, then use this page skeleton as a starting point:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Map</title>
    <link rel="stylesheet" href="/your-assets-path/interactive-map.css">
    <script defer src="/your-assets-path/interactive-map/index.js"></script>
    <script defer src="/your-assets-path/maplibre-provider/index.js"></script>
    <script defer>
      document.addEventListener('DOMContentLoaded', function () {
        const interactiveMap = new defra.InteractiveMap('map', {
          mapProvider: defra.maplibreProvider(),
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
      })
    </script>
  </head>
  <body>
    <div id="map"></div>
  </body>
</html>
```

> [!NOTE]
> Scripts are loaded dynamically — all files in each `umd/` folder must be served from the same directory as their `index.js`.

## Using plugins

**ESM** — add the plugin import and its CSS alongside your existing core imports, then pass it to `plugins`:

```js
import createInteractPlugin from '@defra/interactive-map/plugins/interact'
import '@defra/interactive-map/plugins/interact/css'

const interactiveMap = new InteractiveMap('map', {
  // ...your existing options
  plugins: [createInteractPlugin()]
})
```

**UMD** — copy the plugin's `dist/umd/` folder to your assets if you haven't already, then add its script and CSS to your page skeleton:

```html
<link rel="stylesheet" href="/your-assets-path/interact-plugin.css">
<script defer src="/your-assets-path/interact-plugin/index.js"></script>
```

Then pass the plugin in your initialisation:

```js
const interactiveMap = new defra.InteractiveMap('map', {
  // ...your existing options
  plugins: [defra.interactPlugin()]
})
```

Each plugin distributes its own CSS. Import or copy only the CSS for the plugins you use. See [Plugins](./plugins.md) for the full list including their CSS paths.
