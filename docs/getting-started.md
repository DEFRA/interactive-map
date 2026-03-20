# Getting started

## Installation

```shell
npm i @defra/interactive-map@x.y.z-alpha
```

[!NOTE]  
Install using a fixed version (e.g. npm install @defra/interactive-map@x.y.z-alpha) as this package is currently in alpha and may introduce breaking changes. Check the GitHub releases page for the latest available [version](https://github.com/DEFRA/interactive-map/tags).

### MapLibre provider (recommended)

**ESM:** `maplibre-gl` is a peer dependency, install it separately:

```shell
npm i maplibre-gl
```

**UMD:** `maplibre-gl` is bundled — no separate install needed.

### ESRI provider (optional)

If you are using the ESRI map provider instead, install `@arcgis/core`:

```shell
npm i @arcgis/core
```

### Include in your project

**ESM** — import in your JavaScript:

```js
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'

import '@defra/interactive-map/css'
```

**UMD** — copy the `dist/umd/` folders to your assets and include via script and link tags in your `<head>`:

```html
<link rel="stylesheet" href="/assets/interactive-map.css">
<script defer src="/assets/interactive-map/index.js"></script>
<script defer src="/assets/maplibre-provider/index.js"></script>
```

> Chunks are loaded dynamically — all files in each `umd/` folder must be served from the same directory as their `index.js`.

## Basic usage

Add a container element in your HTML:

```html
<div id="map"></div>
```

Initialise the map in your JavaScript. UMD users replace `InteractiveMap` and `maplibreProvider` with `defra.InteractiveMap` and `defra.maplibreProvider`:

```js
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

## Using plugins

**ESM** — import each plugin and its CSS:

```js
import createSearchPlugin from '@defra/interactive-map/plugins/search'
import createInteractPlugin from '@defra/interactive-map/plugins/interact'

import '@defra/interactive-map/plugins/search/css'
import '@defra/interactive-map/plugins/interact/css'
```

**UMD** — copy each plugin's `dist/umd/` folder and CSS file to your assets:

```html
<link rel="stylesheet" href="/assets/search-plugin.css">
<link rel="stylesheet" href="/assets/interact-plugin.css">
<script src="/assets/search-plugin/index.js"></script>
<script src="/assets/interact-plugin/index.js"></script>
```

Then pass plugins when initialising. UMD users replace `createSearchPlugin` and `createInteractPlugin` with `defra.searchPlugin` and `defra.interactPlugin`:

```js
const interactiveMap = new InteractiveMap('map', {
  mapProvider: maplibreProvider(),
  plugins: [
    createSearchPlugin(),
    createInteractPlugin()
  ],
  // ... other options
})
```

Each plugin distributes its own CSS. Import or copy only the CSS for the plugins you use. See [Plugins](./plugins.md) for the full list including their CSS paths.

## GOV.UK Prototype kit plugin

Following installation the InteractiveMap plugin will be added to your prototype. You can now create pages with a map, and configure for specific use cases.

See [GOV.UK Prototype Kit - Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins).
