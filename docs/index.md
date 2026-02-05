---
sidebar_position: 1
slug: /
---

# Interactive Map Documentation

Welcome to the DEFRA Interactive Map documentation. This is an accessible map component designed for specific use cases with a focus on accessibility.

## Quick Start

Install the package:

```shell
npm i @defra/interactive-map
```

Create a simple map:

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

## What's Inside

- **[Getting Started](getting-started)** - Installation and basic usage
- **[API Reference](api)** - Complete API documentation
- **[Plugins](plugins)** - Extend functionality with plugins
- **[Architecture](architecture)** - Learn about the design and structure
- **[GOV.UK Prototype](govuk-prototype)** - Use with GOV.UK Prototype Kit

## Features

- ✅ Accessible and keyboard navigable
- 🗺️ Multiple map provider support (MapLibre, ESRI)
- 🔌 Extensible plugin system
- 🎨 Customizable styling and behaviors
- 📱 Responsive design
- ⚛️ React integration

## Support

For issues and feature requests, visit our [GitHub repository](https://github.com/DEFRA/interactive-map).
