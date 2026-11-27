/**
 * Checks whether the browser can run module workers (`new Worker(url, { type: 'module' })`).
 *
 * Module workers can't be detected without creating a worker, which a Content Security Policy can
 * report as a violation, so this checks for a CSS feature that arrived alongside them instead.
 * Firefox added `infinity` in `calc()` in the same release as module workers (114). Chrome, Edge,
 * Opera, Samsung Internet and Safari had both by the versions the modern-syntax check in index.js
 * already requires, so this rules out the same browsers as checking for module workers would.
 *
 * @returns {boolean} true if module workers are supported, false otherwise
 */
export const supportsModuleWorkers = () => typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('width', 'calc(infinity * 1px)')
