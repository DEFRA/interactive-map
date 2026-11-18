# Map Loading Plugin

Shows an accessible loading overlay over the map while the app downloads, mounts and loads its first tiles.

The component has no built-in, consumer-facing loading indicator: `im-is-loading` only hides the page body until the app mounts. This plugin manages the overlay itself, outside the React app, so it covers the **whole** loading window — script evaluation, chunk download, React mount and tile loading — and dismisses itself when the map first goes idle.

```html
<div id="map" style="height: 400px"></div>
```

```js
import createMapLoadingPlugin from '@defra/interactive-map/plugins/map-loading'

const mapLoadingPlugin = createMapLoadingPlugin({
  container: 'map'
})

const interactiveMap = new InteractiveMap('map', {
  // ... other options
  plugins: [mapLoadingPlugin]
})
```

Because the overlay is created when the factory runs — before `InteractiveMap` loads anything — the message is on screen from the very start. For an even earlier state, render the overlay markup server-side inside the container and the plugin adopts it (see [`adopt`](#adopt)).

## Behaviour notes

- **Show delay**: the overlay waits [`delay`](#delay) milliseconds (default `200`) before mounting, so a map that reaches first idle quickly never flashes a spinner.
- **Dismissal** happens automatically on `map:firstidle`, when the component renders its `.im-c-error` failure markup, on `map:destroy`, or after the safety [`timeout`](#timeout). You can also call `dismiss()` yourself (for example when your own error handling replaces the map). A dismiss during the show delay cancels the pending mount.
- **Reloads are covered**: if the app is removed and loaded again (`removeApp`/`loadApp`), the overlay reappears on the next `map:ready` and dismisses on the next `map:firstidle`. An app reopened with preserved state dismisses immediately.
- **`buttonFirst` and `hybrid` launchers**: use [`deferred`](#deferred) so the overlay only appears once the user opens the map, and usually [`fullscreen`](#fullscreen) too, since those behaviours open fullscreen.
- **Styling**: the overlay lives outside the app root, so it can't read the app's CSS variables. Theme it with the `--im-map-loading-*` custom properties listed under [Styling](#styling), or supply your own [`content`](#content) and [`className`](#classname).
- **Reduced motion**: the spinner only spins when `prefers-reduced-motion: no-preference`. Under `reduce` it stays as a static ring so the loading state remains visible without continuous rotation.

## Options

Options are passed to the factory function when creating the plugin.

---

### `container`
**Type:** `HTMLElement | string`
**Required**

The map's container element, or its `id` — the same element passed to `new InteractiveMap(id, ...)`.

```js
createMapLoadingPlugin({ container: 'map' })
```

Without a container the plugin is inert: every helper is a safe no-op.

---

### `text`
**Type:** `string`
**Default:** `'Loading map'`

The message under the spinner. Ignored when [`content`](#content) supplies a `Node`.

---

### `spinner`
**Type:** `boolean`
**Default:** `true`

Whether the default content includes the spinner element. Set `false` for a text-only overlay.

---

### `content`
**Type:** `Node | string | (overlayEl) => Node | string`

Custom overlay content. A `Node` (or a function returning one) replaces the default spinner and text entirely. A string replaces the text but keeps the spinner.

```js
createMapLoadingPlugin({
  container: 'map',
  content: () => {
    const el = document.createElement('p')
    el.textContent = 'Fetching flood data…'
    return el
  }
})
```

---

### `className`
**Type:** `string`

Extra class names added to the overlay element, for host-specific styling hooks.

---

### `role`
**Type:** `string`
**Default:** `'status'`

The overlay's ARIA role. `status` makes it a polite live region, so the message is announced without interrupting the user.

---

### `adopt`
**Type:** `string | false`
**Default:** `'.im-c-map-loading'`

Selector for a server-rendered overlay element inside the container. When matched, that element is adopted — moved out of the container before React mounts over it — instead of the plugin building its own. This gives a loading message from first paint, before any JavaScript runs. Set `false` to always build a fresh overlay.

```html
<div id="map">
  <div class="im-c-map-loading" role="status">
    <span class="im-c-map-loading__spinner" aria-hidden="true"></span>
    <span class="im-c-map-loading__text">Loading map</span>
  </div>
</div>
```

---

### `fullscreen`
**Type:** `boolean`
**Default:** `false`

Position the overlay `fixed` to cover the whole viewport instead of just the container. Use this with `mapOnly`, or with `deferred` for `buttonFirst`/`hybrid` behaviours that open fullscreen.

---

### `deferred`
**Type:** `boolean`
**Default:** `false`

Stay hidden until the app actually starts loading. For `buttonFirst` and `hybrid` launcher behaviours the map container is just a launcher before the user opens it, so an always-on overlay would hide the launcher itself. In deferred mode the plugin watches for the open button being hidden — the component's "load started" signal — shows the overlay through the load, and re-arms each time the app closes back to the launcher.

Leave it `false` (the default) for `inline` maps, which start loading as soon as `InteractiveMap` is constructed.

---

### `delay`
**Type:** `number`
**Default:** `200`

Milliseconds to wait after a show request before mounting the overlay. Fast loads that reach first idle inside this window never show a spinner. `0` mounts immediately. The safety [`timeout`](#timeout) starts only once the overlay has actually mounted.

---

### `timeout`
**Type:** `number`
**Default:** `60000`

Milliseconds after which the overlay dismisses itself anyway. Providers don't forward map `error` events for failed style or tile fetches, so this safety net avoids leaving an overlay over a map that will never reach idle. `0` disables it.

---

### `errorSelector`
**Type:** `string | false`
**Default:** `'.im-c-error'`

Dismiss the overlay when this marker appears inside the container — the class the component renders its own failure message with. Set `false` to disable the error watch.

---

### `dismissOnFirstIdle`
**Type:** `boolean`
**Default:** `true`

Dismiss the overlay on `map:firstidle`. Set `false` if you want to control dismissal entirely yourself via `dismiss()`.

---

### `onShow`
**Type:** `() => void`

Called each time the overlay mounts.

---

### `onDismiss`
**Type:** `(reason: string) => void`

Called each time the overlay is removed. The reason is one of `'firstidle'`, `'error'`, `'timeout'`, `'destroy'`, `'appopened'` or `'manual'`. Not called if the overlay never mounted (for example `dismiss()` / `destroy()` during the show [`delay`](#delay), or while still waiting in [`deferred`](#deferred) mode).

## Methods

Methods are called on the plugin instance returned by the factory.

### `show()`

Mount the overlay (no-op if it's already shown, or the container is displaying an error). You rarely need this — the app lifecycle calls it for you — but it's useful if your integration reloads the map outside the normal open/close cycle.

### `dismiss(reason?)`

Remove the overlay. Optional `reason` string is passed through to `onDismiss` (defaults to `'manual'`).

```js
interactiveMap.on('app:closed', () => mapLoadingPlugin.dismiss())
```

### `isShown()`

Returns `true` while the overlay is mounted.

### `destroy()`

Remove the overlay and disconnect all watchers. Call if your page tears the map down permanently.

## Events

This plugin does not emit any custom events. It subscribes to `map:ready`, `map:firstidle`, `map:destroy` and `app:opened`.

## Styling

The overlay renders outside the app root, so app-level CSS variables don't apply. Set these custom properties on `:root`, `body`, or the overlay's own class:

| Custom property | Default | Description |
|---|---|---|
| `--im-map-loading-background` | `rgb(255 255 255 / 85%)` | Overlay backdrop |
| `--im-map-loading-color` | `--foreground-color` | Text colour |
| `--im-map-loading-z-index` | `1000` | Stacking order (above the fullscreen app's 999) |
| `--im-map-loading-gap` | `16px` | Space between spinner and text |
| `--im-map-loading-font-size` | `1.5rem` | Message size |
| `--im-map-loading-spinner-size` | `96px` | Spinner diameter |
| `--im-map-loading-spinner-width` | `12px` | Spinner ring thickness |
| `--im-map-loading-spinner-color` | `--primary-button-color` | Spinner highlight colour |
| `--im-map-loading-spinner-track-color` | `#f3f2f1` | Spinner ring colour |

The spinner animation is gated behind `prefers-reduced-motion: no-preference`. When the user prefers reduced motion, the spinner remains a static ring (no continuous rotation).
