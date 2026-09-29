// src/App/renderer/applicationModes.js

/**
 * The two halves of the application mode data the helpers below need: the stack of modes set at
 * runtime (app state) and the consumer's fixed applicationModes option (app config).
 *
 * @param {{ applicationModeEntries?: Array<Object> }} appState
 * @param {{ applicationModes?: Object }} [appConfig]
 * @returns {{ entries: Array<{ id: string, include: string[] | null, exclude: string[] | null }>, config: Object }}
 */
export const selectApplicationModes = (appState, appConfig) => ({
  entries: appState?.applicationModeEntries ?? [],
  config: appConfig?.applicationModes ?? {}
})

/**
 * The current application mode: the top of the stack, skipping any mode the consumer's config
 * disables (false). Only the current mode applies; modes underneath wait until they're on top again.
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @returns {{ id: string, include: string[] | null, exclude: string[] | null } | null}
 */
export const getCurrentApplicationMode = ({ entries, config }) => {
  const enabledModes = entries.filter(mode => config[mode.id] !== false)
  return enabledModes[enabledModes.length - 1] ?? null // NOSONAR, .length - 1 used instead of .at(-1) for wider browser support
}

/**
 * The root class for the current mode, or null when there's no current mode.
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @returns {string | null}
 */
export const getApplicationModeClass = (modes) => {
  const currentMode = getCurrentApplicationMode(modes)
  return currentMode ? `im-o-app--mode-${currentMode.id}` : null
}

const includesAny = (list, ids) => !!list && ids.some(id => list.includes(id))

/**
 * Whether the current application mode hides an item. The consumer's config for the mode adjusts
 * what the mode was set with, so it's checked first and wins for the items it names: exclude
 * removes, include appends. Every other item follows the mode's own lists: with include, only listed
 * items show; with exclude, listed items are hidden. Items are hidden with CSS, never unmounted, so
 * their state survives.
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @param {string[]} ids - The item's id(s); one id can name a button and its panel.
 * @returns {boolean}
 */
export const isHiddenByApplicationMode = (modes, ids) => {
  const currentMode = getCurrentApplicationMode(modes)
  if (!currentMode) {
    return false
  }
  const config = modes.config[currentMode.id]
  if (includesAny(config?.exclude, ids)) {
    return true
  }
  if (includesAny(config?.include, ids)) {
    return false
  }
  return (!!currentMode.include && !includesAny(currentMode.include, ids)) || includesAny(currentMode.exclude, ids)
}
