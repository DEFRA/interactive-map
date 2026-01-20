// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Renders an error message inside the given root element.
 *
 * @param {HTMLElement} rootEl - The root element to render the error into.
 * @param {string} message - The error message to display.
 * @returns {void}
 */
export function renderError (rootEl, message) {
  rootEl.innerHTML = `<div class="im-c-error">${message}</div>`
}
