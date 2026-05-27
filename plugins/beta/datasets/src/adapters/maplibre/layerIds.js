// ─── Internal helpers ─────────────────────────────────────────────────────────
const HASH_BASE = 36
const MAX_TILE_ZOOM = 22

export { MAX_TILE_ZOOM }

export const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = Math.trunc(((hash << 5) - hash) + ch.codePointAt(0))
  }
  return Math.abs(hash).toString(HASH_BASE)
}
