/**
 * Checks whether the browser can run module workers (`new Worker(url, { type: 'module' })`).
 *
 * Browsers that support module workers read the `type` option while converting the options
 * object, before the URL is validated, so the getter is called even though construction fails.
 *
 * @returns {boolean} true if module workers are supported, false otherwise
 */
export const supportsModuleWorkers = () => {
  if (typeof Worker === 'undefined') {
    return false
  }
  let supported = false
  const options = {
    get type () {
      supported = true
      return 'module'
    }
  }
  try {
    new Worker('blob://', options).terminate()
  } catch (_) { // NOSONAR - construction is expected to fail; only the getter call matters
  }
  return supported
}
