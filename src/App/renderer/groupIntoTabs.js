import { orderItems } from './orderItems.js'
import { stringToKebab } from '../../utils/stringToKebab.js'

/**
 * Groups a flat list of `{ id, order, tab, element }` items into tabs, when warranted.
 *
 * Items are partitioned by `tab`, kebab-cased as the join key — two items share a tab by
 * producing the same key. Items with no `tab` share one fallback bucket. Returns `null` when
 * there's one bucket or fewer, so the caller can fall back to flat rendering unchanged.
 *
 * Each bucket's members are ordered via `orderItems`; the resulting tab's own `order` and
 * displayed `name` both come from whichever member ends up first in that ordering — the same
 * item that "wins" the position also wins the label, so there's nothing separate to reconcile
 * when members disagree. The tabs themselves are then ordered the same way, via `orderItems`
 * again — no new ordering concept, just the existing one applied twice.
 */
export function groupIntoTabs ({ items, fallbackLabel }) {
  const buckets = new Map() // kebab key (or null for the untagged/fallback bucket) -> members[]

  for (const item of items) {
    const key = item.tab ? stringToKebab(item.tab) : null
    if (!buckets.has(key)) {
      buckets.set(key, [])
    }
    buckets.get(key).push(item)
  }

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
