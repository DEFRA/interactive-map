# Getting started

## Installation

Run:

```shell
npm i @defra/interactive-map
```

## Use in production

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
  containerHeight: '650px',
  mapStyle: {
    url: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
    backgroundColor: '#f5f5f0'
  }
})
```

## GOV.UK Prototype kit plugin

Following installation the InteractiveMap plugin will be added to your prototype. You can now create pages with a map, and configure for specific use cases.

See [Install and use plugins](https://prototype-kit.service.gov.uk/docs/install-and-use-plugins).

See [Configuring InteractiveMap in a GOVUK Prototype](./docs/govuk-prototype).