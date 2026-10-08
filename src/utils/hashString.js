const HASH_BASE = 36
const HASH_MULTIPLIER = 31
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/**
 * A short, deterministic base-36 hash of a string: two independent 32-bit hashes (×31 and
 * FNV-1a), together about 64 bits, so two different inputs sharing a hash is vanishingly unlikely.
 *
 * @param {string} str
 * @returns {string}
 */
export const hashString = (str) => {
  let multiplied = 0
  let fnv = FNV_OFFSET
  for (const character of str) {
    const code = character.codePointAt(0)
    // Math.imul takes its inputs as 32-bit integers, so multiplied wraps to 32 bits each pass
    multiplied = Math.imul(multiplied, HASH_MULTIPLIER) + code
    fnv = Math.imul(fnv ^ code, FNV_PRIME)
  }
  return (multiplied >>> 0).toString(HASH_BASE) + (fnv >>> 0).toString(HASH_BASE)
}
