import { stringToKebab } from '../../utils/stringToKebab.js'

/**
 * Partitions a list of items into buckets, keyed by `keyFn(item)` kebab-cased — two items
 * share a bucket by producing the same key (so 'Map Size' and 'map size' merge). Items for
 * which `keyFn` returns a falsy value all share one `null`-keyed bucket. Bucket iteration
 * order follows first-encountered order, same as `Map`.
 *
 * Shared by `groupIntoTabs` (panel/control tabs) and `mapButtons` (button groups) — the two
 * callers differ only in what happens *after* bucketing (how a bucket's own order/label is
 * derived), not in how items get partitioned.
 *
 * @returns {Map<string|null, object[]>}
 */
export function groupByKey ({ items, keyFn }) {
  const buckets = new Map()

  for (const item of items) {
    const raw = keyFn(item)
    const key = raw ? stringToKebab(raw) : null
    if (!buckets.has(key)) {
      buckets.set(key, [])
    }
    buckets.get(key).push(item)
  }

  return buckets
}
