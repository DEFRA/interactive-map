# KeyboardShortcutDefinition

Describes a single row in the keyboard shortcuts help panel (opened via <kbd>Shift</kbd> + <kbd>?</kbd>). Plugins register these via [PluginManifest](../plugins/plugin-manifest.md)'s `keyboardShortcuts`; the app's own built-in shortcuts use this same shape internally.

Registering a `KeyboardShortcutDefinition` only adds a row to the help panel — it does **not** bind the key itself. Wire up the actual keydown/keyup handling separately (e.g. in your plugin's `InitComponent`) and use the same key combination in both places.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique shortcut identifier. Re-registering with an id already used by your plugin replaces that entry.

---

### `title`
**Type:** `string`
**Required**

Accessible title shown in the help panel.

---

### `command`
**Type:** `string`
**Required**

HTML string describing the key combination, wrapped in `<kbd>` tags:

```js
{
  id: 'myPluginAction',
  title: 'Do the thing',
  command: '<kbd>Shift</kbd> + <kbd>X</kbd>'
}
```

> [!TIP]
> If your shortcut uses the Alt key, label it per platform — macOS keyboards and menus call it **Option**, not Alt (Windows/Linux keep Alt). Use the shared `isMac()` helper (`src/utils/isMac.js`) to build the label, the same way the app's own core shortcuts and the `draw` plugin's `drawUndo`/`drawSelectAdjacentPoint` entries do:
>
> ```js
> import { isMac } from '../../src/utils/isMac.js'
>
> const altKeyHtml = isMac() ? '<kbd>Option</kbd>' : '<kbd>Alt</kbd>'
>
> // command: `${altKeyHtml} + <kbd>X</kbd>`
> ```
>
> The same applies to Cmd/Ctrl-based shortcuts — see `drawUndo`'s `<kbd>Command</kbd> + <kbd>Z</kbd>` / `<kbd>Ctrl</kbd> + <kbd>Z</kbd>` for that pattern.

---

### `context`
**Type:** `'viewport' | 'listbox' | 'global'`
**Optional, default:** `'viewport'`

Which help-panel context this shortcut applies to. This only affects which tab the panel opens on by default when it's shown — it doesn't affect whether the row itself is displayed.

---

### `group`
**Type:** `string`
**Optional, default:** `'Navigate'`

Tab label the shortcut is grouped under in the help panel. Shortcuts sharing a group (case/whitespace-insensitive) appear together under one tab. If every visible shortcut ends up sharing a single group, the panel renders as a flat list with no tabs at all.

---

### `requiredConfig`
**Type:** `string[]`
**Optional**

App config keys that must all be truthy for the shortcut to appear in the help panel. Useful when your shortcut only does something meaningful once a related config option is set:

```js
{
  id: 'myPluginAction',
  title: 'Do the thing',
  command: '<kbd>Shift</kbd> + <kbd>X</kbd>',
  requiredConfig: ['myPluginFeatureEnabled']
}
```

---

### `visuallyHidden`
**Type:** `boolean`
**Optional, default:** `false`

When true, the row is hidden from sighted users (it stays in the DOM with a visually-hidden style) but remains discoverable by assistive technology. Use this for a shortcut with no visual affordance to discover it by otherwise — for example, one whose only effect is a screen reader announcement:

```js
{
  id: 'myPluginAction',
  title: 'Announce something useful',
  command: '<kbd>Shift</kbd> + <kbd>X</kbd>',
  visuallyHidden: true
}
```
