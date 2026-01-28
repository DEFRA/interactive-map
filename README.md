# Interactive map

[![CI](https://github.com/defra/interactive-map/workflows/CI/badge.svg)](https://github.com/defra/interactive-map/actions)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_interactive-map&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_interactive-map)
[![npm version](https://img.shields.io/npm/v/@defra/interactive-map.svg)](https://www.npmjs.com/package/@defra/interactive-map)
[![Dependencies](https://img.shields.io/librariesio/release/npm/@defra/interactive-map)](https://libraries.io/npm/@defra%2Finteractive-map)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Interactive Map** is a lightweight map component designed for public-facing government services, and available for anyone to use.
Built to GOV.UK standards, with accessibility at its core, Interactive Map supports a wide range of users across abilities, devices and input methods.
It is open source and works with multiple mapping engines. The component can be extended through plugins to meet the specific needs of a service.

See [examples](https://google.co.uk).

**⚠️ This project is currently in beta and is not yet stable. Documentation and support are not yet available.**

<p align="center">
  <img src="docs/assets/screens-white.jpg" alt="Screenshots of map component" width="800">
</p>

## Getting started

### Installation

### Installation

Run:

```shell
npm i @defra/interactive-map
```

### Use in production

In your html, you will need to add a container element for the map:

```html
<div id="map"></div>
```

You will need to initialise and configure InteractiveMap in your client side code:

```js
import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'

const interactiveMap = new InteractiveMap('map', {
  mapProvider: maplibreProvider(),
  behaviour: 'hybrid',
  mapLabel: 'Ambleside',
  zoom: 14,
  center: [-2.968, 54.425],
  minZoom: 6,
  maxZoom: 18,
  containerHeight: '650px',
  mapStyle: {
    url: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
    backgroundColor: '#f5f5f0'
  }
})
```

### GOV.UK Prototype kit plugin

Following installation the Interactive Map plugin will be added to your prototype. You can now create pages, add and configure the map for specific use cases.

See [Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins).

## Documentation

[API](./docs/api.md)

[Plugins](./docs/plugins.md)

[Architecture](./docs/architecture.md)

## Contributing

To follow...
