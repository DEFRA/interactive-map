# Getting started

## Installation

```shell
npm i @defra/interactive-map
```

### MapLibre provider (recommended)

The MapLibre provider is the default map renderer. In the ESM build, `maplibre-gl` is a peer dependency and must be installed separately:

```shell
npm i maplibre-gl
```

> **UMD/script-tag consumers** — `maplibre-gl` is bundled into the UMD build, so no separate install is needed.

### ESRI provider (optional)

If you are using the ESRI map provider instead, install `@arcgis/core`:

```shell
npm i @arcgis/core
```

## CSS

The library ships CSS that must be loaded separately. If your bundler supports CSS imports (webpack, Vite, etc.), import it in your JavaScript:

```js
import '@defra/interactive-map/css'
```

Otherwise, copy `node_modules/@defra/interactive-map/dist/css/index.css` to your public assets folder and reference it with a `<link>` tag:

```html
<link rel="stylesheet" href="/assets/interactive-map.css">
```

## Basic usage

Add a container element in your HTML:

```html
<div id="map"></div>
```

Initialise the map in your client-side JavaScript:

```js
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'

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

Plugins are passed via the `plugins` option. Each plugin exports a factory function:

```js
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'
import createSearchPlugin from '@defra/interactive-map/plugins/search'
import createInteractPlugin from '@defra/interactive-map/plugins/interact'

import '@defra/interactive-map/css'
import '@defra/interactive-map/plugins/search/css'
import '@defra/interactive-map/plugins/interact/css'

const interactiveMap = new InteractiveMap('map', {
  mapProvider: maplibreProvider(),
  plugins: [
    createSearchPlugin(),
    createInteractPlugin()
  ],
  // ... other options
})
```

Each plugin distributes its own CSS via a subpath export (`@defra/interactive-map/plugins/{name}/css`). Import only the CSS for the plugins you use. See [Plugins](./plugins.md) for the full list including their CSS paths.

## GOV.UK Prototype kit plugin

Following installation the InteractiveMap plugin will be added to your prototype. You can now create pages with a map, and configure for specific use cases.

See [Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins).

See [Configuring InteractiveMap in a GOVUK Prototype](./govuk-prototype.md).
