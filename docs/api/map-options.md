# MapOptions

Configuration object specifying map provider, map style, behaviour, and other settings for an `InteractiveMap` instance.

> Used as the `options` parameter in `new InteractiveMap(container, options)`.

## Properties

**`mapProvider`**
(`function`, required)  
A factory function that returns a map provider instance (e.g. `maplibreProvider()`).

**`behaviour`** (`string`, default `'buttonFirst'`)  
Map interaction behaviour. Options include `'buttonFirst'`, `'hybrid'`, `'inline'` and `'mapOnly'`.

**`mapLabel`** (`string`, required)  
Accessible label for the map.

**`containerHeight`** (`string`, default `'500px'`)  
Height of the map container.

**`mapStyle`** (`MapStyle`, required)  
Map style configuration. See [MapStyle](./api/map-style.md) for full details.

## Map framework options

Options supported by the underlying map framework should be provided here
(e.g. `zoom`, `center`). These options are passed directly to the map provider.

For a full list of supported options, see [MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/).
