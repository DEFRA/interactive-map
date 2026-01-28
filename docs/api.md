# API reference

**InteractiveMap** is a customisable mapping interface, designed for specific use cases and with a focus on accessibiity. It is provided as a high-level API that works in conjunction with a mapping framework such as MapLibre. Alternative mapping frameworks are catererd for through the development of a custom provider.

The `InteractiveMap` object represents an instance of an InteractiveMap on your page. It provides emits events and provides methods that allow you to programmatically modify the map and trigger behaviour as users interact with it.

You create an instance of a InteractiveMap by specifying a `container` and `options` in the constructor. An InteractiveMap is then initialized on the page and returns an instance of an InteractiveMap object.

## Getting started

For installation and full basic setup instructions, see the [Getting started](./getting-started.md) guide.

## Constructor

```js
new InteractiveMap(container, options)
```

> [!NOTE]
> UMD Usage: Replace InteractiveMap with defra.InteractiveMap if using pre-built scripts in the <head>. The rest of the code is identical.

| Parameter   | Type | Description |
|------------ |----- |------------ |
| **`container`** | `string` | The `id` of a container element where the map will be rendered. |
| **`options`**   | `MapOptions` | Configuration object specifying map provider, map style, behaviour, and other settings. See [MapOptions](./api/map-options.md) for full details. |