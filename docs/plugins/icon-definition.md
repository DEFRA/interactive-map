# IconDefinition

Definition for a custom icon that can be registered and used by buttons.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique icon identifier. Use this ID to reference the icon in button definitions via the `iconId` property.

---

### `svgContent`
**Type:** `string`
**Required**

Raw SVG content without the outer `<svg>` tag. The component will wrap your content in an appropriately sized SVG element.

```js
{
  id: 'my-icon',
  svgContent: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>'
}
```
