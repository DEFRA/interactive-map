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
 * The active application modes, least recently set first: every mode on the stack, unless the
 * consumer's config disables it (false).
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @returns {Array<{ id: string, include: string[] | null, exclude: string[] | null }>}
 */
export const getActiveApplicationModes = ({ entries, config }) =>
  entries.filter(mode => config[mode.id] !== false)

/**
 * The root class for the most recently set active mode, or null when no mode is active.
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @returns {string | null}
 */
export const getApplicationModeClass = (modes) => {
  const activeModes = getActiveApplicationModes(modes)
  const topMode = activeModes[activeModes.length - 1] // NOSONAR, .length - 1 used instead of .at(-1) for wider browser support
  return topMode ? `im-o-app--mode-${topMode.id}` : null
}

const includesAny = (list, ids) => !!list && ids.some(id => list.includes(id))

/**
 * Whether one active mode shows an item. The consumer's config for the mode adjusts what the mode
 * was set with, so it's checked first and wins for the items it names: exclude removes, include
 * appends. Every other item follows the mode's own lists: with include, only listed items show;
 * with exclude, listed items are hidden.
 */
const isVisibleInMode = (mode, config, ids) => {
  if (includesAny(config?.exclude, ids)) {
    return false
  }
  if (includesAny(config?.include, ids)) {
    return true
  }
  return (!mode.include || includesAny(mode.include, ids)) && !includesAny(mode.exclude, ids)
}

/**
 * Whether the active application modes hide an item: true when any active mode doesn't show it.
 * Items are hidden with CSS, never unmounted, so their state survives.
 *
 * @param {{ entries: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @param {string[]} ids - The item's id(s); one id can name a button and its panel.
 * @returns {boolean}
 */
export const isHiddenByApplicationMode = (modes, ids) =>
  getActiveApplicationModes(modes).some(mode => !isVisibleInMode(mode, modes.config[mode.id], ids))
