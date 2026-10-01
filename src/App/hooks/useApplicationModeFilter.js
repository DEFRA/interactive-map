import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { createApplicationModeFilter, selectApplicationModes } from '../renderer/applicationModes.js'

/**
 * The current application mode's filter: whether it hides a given item. Built once per render of
 * the caller, so every item asks the same precomputed rules. Not memoised: the plugin registry's
 * list is mutated in place as plugins register, so it can't be a reliable dependency.
 *
 * @returns {(item: { ids: string[], pluginId?: string, isModal?: boolean }) => boolean}
 */
export const useApplicationModeFilter = () => {
  const appConfig = useConfig()
  const appState = useApp()
  return createApplicationModeFilter(selectApplicationModes(appState, appConfig))
}
