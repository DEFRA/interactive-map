// Keyboard users get the browser's own scroll to the newly focused element, as they're following
// focus. Mouse and touch users have just clicked something on the map, so the page stays where it is.
export const getFocusOptions = (interfaceType) => ({ preventScroll: interfaceType !== 'keyboard' })
