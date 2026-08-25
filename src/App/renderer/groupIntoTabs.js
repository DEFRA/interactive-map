import { orderItems } from './orderItems.js'
import { groupByKey } from './groupByKey.js'

/**
 * Groups a flat list of `{ id, order, tab, element }` items into tabs, when warranted.
 *
 * Items are partitioned by `tab` via `groupByKey` — two items share a tab by producing the
 * same kebab-cased key. Items with no `tab` share one fallback bucket. Returns `null` when
 * there's one bucket or fewer, so the caller can fall back to flat rendering unchanged.
 *
 * Each bucket's members are ordered via `orderItems`; the resulting tab's own `order` and
 * displayed `name` both come from whichever member ends up first in that ordering — the same
 * item that "wins" the position also wins the label, so there's nothing separate to reconcile
 * when members disagree. The tabs themselves are then ordered the same way, via `orderItems`
 * again — no new ordering concept, just the existing one applied twice.
 *
 * This derived-order approach is safe here because tabs are mutually exclusive — only the
 * active tab's content is ever visible, so a "losing" member's own order never has to compete
 * against anything outside its own tab at the same time. `mapButtons`'s button groups don't
 * have that property (every group renders simultaneously), so they don't derive a group's
 * order from its members the same way — see `mapButtons.js`.
 */
export function groupIntoTabs ({ items, fallbackLabel }) {
  const buckets = groupByKey({ items, keyFn: item => item.tab })

  if (buckets.size <= 1) {
    return null
  }

  const tabs = Array.from(buckets.entries()).map(([key, members]) => {
    const orderedMembers = orderItems(members)
    const first = orderedMembers[0]
    return {
      id: key ?? 'default',
      order: first.order,
      name: key ? first.tab : fallbackLabel,
      items: orderedMembers
    }
  })

  return orderItems(tabs)
}
