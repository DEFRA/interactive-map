// src/App/renderer/applicationModes.js

/**
 * Everything the helpers below need: the stack of modes set at runtime (app state), the modes plugins
 * declare in their manifests (via the plugin registry in app state) and the consumer's fixed
 * applicationModes option (app config).
 *
 * @param {{ applicationModeEntries?: Array<Object>, pluginRegistry?: Object }} appState
 * @param {{ applicationModes?: Object }} [appConfig]
 * @returns {{ entries: Array<Object>, declarations: Array<Object>, config: Object }}
 */
export const selectApplicationModes = (appState, appConfig) => ({
  entries: appState?.applicationModeEntries ?? [],
  declarations: (appState?.pluginRegistry?.registeredPlugins ?? []).flatMap(plugin =>
    Object.entries(plugin.manifest?.applicationModes ?? {}).map(([id, lists]) => ({ id, pluginId: plugin.id, ...lists }))
  ),
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

// One list combining several manifests' lists (several manifests can contribute to the same mode)
const mergeLists = (sources, key) => {
  const lists = sources.map(source => source?.[key]).filter(Boolean)
  return lists.length ? lists.flat() : null
}

/**
 * The rules that decide the current mode, in order. The earliest rule that mentions the mode defines
 * it: every plugin manifest that declares it (combined), else the consumer's config, else the options
 * it was set with. Later rules only adjust it.
 */
const getModeRules = (mode, { declarations, config }) => {
  const manifests = declarations.filter(declaration => declaration.id === mode.id)
  const modeRules = [
    manifests.length ? { include: mergeLists(manifests, 'include'), exclude: mergeLists(manifests, 'exclude') } : null,
    config[mode.id] || null,
    mode.include || mode.exclude ? { include: mode.include, exclude: mode.exclude } : null
  ].filter(Boolean)
  return { modeRules, ownerIds: manifests.map(manifest => manifest.pluginId) }
}

// The filter with no current mode, and the renderers' default when they're given no filter
export const hidesNothing = () => false

/**
 * Decides, once per render, how the current application mode treats items, returning a function that
 * says whether it hides a given item. The mode's definition (its first rule) sets the starting point:
 * with an include, only the included items and the declaring plugins' own items show; otherwise
 * everything does. Then every rule in turn appends its include and removes its exclude, so later
 * rules have the final say. Modal items are never hidden, so focus is never trapped in a hidden one.
 *
 * @param {{ entries: Array<Object>, declarations: Array<Object>, config: Object }} modes - From selectApplicationModes.
 * @returns {(item: { ids: string[], pluginId?: string, isModal?: boolean }) => boolean}
 */
export const createApplicationModeFilter = (modes) => {
  const currentMode = getCurrentApplicationMode(modes)
  if (!currentMode) {
    return hidesNothing
  }
  const { modeRules, ownerIds } = getModeRules(currentMode, modes)
  // The first rule is the mode's definition, so it alone decides whether the mode is a takeover
  const isTakeover = !!modeRules[0]?.include
  return ({ ids, pluginId, isModal = false }) => {
    if (isModal) {
      return false
    }
    let isVisible = !isTakeover || ownerIds.includes(pluginId)
    modeRules.forEach(rule => {
      if (includesAny(rule.include, ids)) {
        isVisible = true
      }
      if (includesAny(rule.exclude, ids)) {
        isVisible = false
      }
    })
    return !isVisible
  }
}
