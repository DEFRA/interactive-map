import { EVENTS as events } from '../../config/events.js'

/**
 * Central registry for plugins that contribute items to the shared spatial list (see
 * SpatialList.jsx). Plugins register a live item provider — `{ getItems, exclusive? }` —
 * instead of emitting the list event themselves, so exclusive takeover (draw mid-edit) and
 * additive participation (interact's features/markers) both work safely with any number of
 * contributors.
 *
 * `getItems()` returns `{ items, multiselectable, label, focusable }`, called fresh on every
 * recompute rather than snapshotted at registration. `label` becomes the listbox's aria-label;
 * `focusable: false` (draw's vertex/midpoint items) keeps every item out of the Tab order —
 * see SpatialList.jsx. `exclusive: true` claims sole ownership while held (see
 * claimExclusive/releaseExclusive); everything else is additive and gets concatenated
 * together. Providers call notifyItemsChanged whenever their own items would differ — the
 * registry never polls, it only recomputes in response to a caller flagging a change.
 */
export function createSpatialListRegistry ({ eventBus }) {
  const providers = new Map() // pluginId -> { getItems, exclusive }
  let exclusiveOwner = null

  const recompute = () => {
    let items = []
    let multiselectable = false
    let label
    let focusable

    if (exclusiveOwner && providers.has(exclusiveOwner)) {
      const result = providers.get(exclusiveOwner).getItems() ?? {}
      items = result.items ?? []
      multiselectable = !!result.multiselectable
      label = result.label
      focusable = result.focusable
    } else {
      // Exclusive-capable providers only ever contribute while actually holding the
      // claim (the branch above) — not just whenever nobody happens to hold it.
      providers.forEach((provider) => {
        if (provider.exclusive) { return }
        const result = provider.getItems() ?? {}
        items = items.concat(result.items ?? [])
        multiselectable = multiselectable || !!result.multiselectable
        // First additive provider (in registration order) with a label/focusable value
        // wins — there's no principled way to merge two different values, and today
        // only interact ever contributes additively, so this is just "whatever it
        // declares".
        label = label ?? result.label
        focusable = focusable ?? result.focusable
      })
    }

    eventBus.emit(events.MAP_SET_SPATIAL_LIST, { items, multiselectable, label, focusable })
  }

  function registerItemProvider (pluginId, { getItems, exclusive = false }) {
    providers.set(pluginId, { getItems, exclusive })
    recompute()
  }

  function unregisterItemProvider (pluginId) {
    providers.delete(pluginId)
    if (exclusiveOwner === pluginId) {
      exclusiveOwner = null
    }
    recompute()
  }

  // Mirrors mapProvider.activeMoveTarget's single-claim contract (MoveControls.jsx),
  // generalised to however many participants are registered rather than always
  // exactly two — only one exclusive claim can be held at a time, and holding it
  // means every other registered provider is ignored until it's released.
  function claimExclusive (pluginId) {
    exclusiveOwner = pluginId
    recompute()
  }

  function releaseExclusive (pluginId) {
    if (exclusiveOwner === pluginId) {
      exclusiveOwner = null
      recompute()
    }
  }

  function notifyItemsChanged (pluginId) {
    if (!providers.has(pluginId)) { return }
    // If someone else holds the exclusive claim, this provider isn't feeding the
    // list right now regardless of what changed for it — nothing to recompute.
    if (exclusiveOwner && exclusiveOwner !== pluginId) { return }
    recompute()
  }

  function clear () {
    providers.clear()
    exclusiveOwner = null
  }

  return {
    registerItemProvider,
    unregisterItemProvider,
    claimExclusive,
    releaseExclusive,
    notifyItemsChanged,
    clear
  }
}
