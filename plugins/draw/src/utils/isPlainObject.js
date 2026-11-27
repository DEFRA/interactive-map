/**
 * Returns true for an object literal or Object.create(null). An array, Map, Set, Date, URL or
 * class instance is an object too, but not a plain one.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}
