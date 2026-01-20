/**
 * Creates a clickable button element in the DOM based on the given configuration.
 *
 * The button is inserted before the provided `rootEl` and navigates using
 * the History API when clicked. It also calls the provided `handleClick` callback.
 *
 * @param {Object} config - Button configuration object.
 * @param {string} config.id - Unique ID used in the button URL query parameter.
 * @param {string} config.buttonText - Visible text label for the button.
 * @param {HTMLElement} rootEl - The reference element before which the button is inserted.
 * @param {Function} handleClick - Callback invoked when the button is clicked.
 * @returns {HTMLAnchorElement} The newly created button element.
 */

import defaults from '../config/defaults.js'

export function createButton (config, rootEl, handleClick) {
  const { id, buttonText, buttonClass } = config

  const buttonHTML = `
    <a class="${buttonClass}" role="button">
      <svg focusable='false' aria-hidden='true' width='16' height='20' viewBox='0 0 16 20' fillRule='evenodd'>
        <path d='M15 7.5c.009 3.778-4.229 9.665-7.5 12.5C4.229 17.165-.009 11.278 0 7.5a7.5 7.5 0 1 1 15 0z'/>
        <path d='M7.5 12.961a5.46 5.46 0 1 0 0-10.922 5.46 5.46 0 1 0 0 10.922z' fill='#fff'/>
      </svg>
      <span>${buttonText}</span>
      <span class='im-u-visually-hidden'> (Visual only)</span>
    </a>
  `

  rootEl.insertAdjacentHTML('beforebegin', buttonHTML)
  const button = rootEl.previousElementSibling

  // Build URL keeping existing params
  const url = new URL(window.location.href)
  url.searchParams.set(defaults.mapViewParamKey, id)
  button.setAttribute('href', url.toString())

  button.addEventListener('click', (e) => {
    e.preventDefault()
    handleClick(e)
  })

  return button
}
