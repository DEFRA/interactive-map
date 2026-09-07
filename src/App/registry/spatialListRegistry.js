import { EVENTS as events } from '../../config/events.js'

/**
 * Central registry for plugins that contribute items to the shared spatial list
 * (see SpatialList.jsx/useSpatialListFocus.js). Replaces the old "whoever emits
 * map:setspatiallist last wins" convention that interact alone used to own directly —
 * plugins register a live item provider instead of emitting the event themselves, so
 * ownership (exclusive takeover, e.g. draw mid-edit) and participation (additive, e.g.
 * interact's features/markers) are both explicit, and safe with more than two
 * contributors rather than relying on a single suppression boolean and an unwritten
 * "the other plugin is responsible for it while I'm not" convention.
 *
 * A provider is `{ getItems, exclusive? }`:
 * - `getItems()` returns `{ items, multiselectable, label }` — called fresh on every
 *   recompute, not snapshotted at registration time, so it should read from whatever
 *   ref/state the caller already keeps current (the same pattern useSpatialListFocus.js's
 *   own refs already use), not close over stale values. `label` is this provider's own
 *   name for what the list currently represents (e.g. "Map features", or "Shape points"
 *   for draw's edit-mode vertices) — becomes the listbox's aria-label; see SpatialList.jsx.
 * - `exclusive: true` means this provider wants sole ownership while its claim is
 *   held (draw's edit modes) — see claimExclusive/releaseExclusive. Everything else
 *   is additive by default: with no exclusive claim held, every registered provider's
 *   items are concatenated together (interact's features/markers today).
 *
 * Providers call notifyItemsChanged whenever their own items would be different (a map
 * move, a mode change, an edit) — the registry doesn't poll on any schedule of its own,
 * it only ever recomputes in direct response to a caller telling it something changed.
 */
export function createSpatialListRegistry ({ eventBus }) {
  const providers = new Map() // pluginId -> { getItems, exclusive }
  let exclusiveOwner = null

  const recompute = () => {
    let items = []
    let multiselectable = false
    let label

    if (exclusiveOwner && providers.has(exclusiveOwner)) {
      const result = providers.get(exclusiveOwner).getItems() ?? {}
      items = result.items ?? []
      multiselectable = !!result.multiselectable
      label = result.label
    } else {
      // Exclusive-capable providers only ever contribute while actually holding the
      // claim (the branch above) — not just whenever nobody happens to hold it.
      providers.forEach((provider) => {
        if (provider.exclusive) { return }
        const result = provider.getItems() ?? {}
        items = items.concat(result.items ?? [])
        multiselectable = multiselectable || !!result.multiselectable
        // First additive provider (in registration order) with a label wins — there's
        // no principled way to merge two different labels, and today only interact
        // ever contributes additively, so this is just "whatever it declares".
        label = label ?? result.label
      })
    }

    eventBus.emit(events.MAP_SET_SPATIAL_LIST, { items, multiselectable, label })
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
