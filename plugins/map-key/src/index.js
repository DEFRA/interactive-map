import './mapKey.scss'

/**
 * Display options for a group of key entries.
 *
 * @typedef {Object} MapKeyGroupConfig
 *
 * @property {string} [groupLabel]
 * Heading shown above the group. Replaces the heading the group's entries provide.
 *
 * @property {'ramp'} [groupStyle]
 * How the group's entries are laid out. `'ramp'` shows them as touching bands: in a row with each
 * label centred below its band when every label fits on one line, otherwise stacked with each
 * label beside its band. When any entry has a stroke, the bands are separated by a small gap.
 */

/**
 * Options for the map key plugin.
 *
 * @typedef {Object} MapKeyPluginOptions
 *
 * @property {string} [noKeyItemText='No features displayed']
 * Text shown in the key panel when it has no visible entries to display.
 *
 * @property {Object<string, MapKeyGroupConfig>} [groups]
 * Display options for key groups, keyed by group id.
 */

/**
 * Creates the map key plugin.
 *
 * @param {MapKeyPluginOptions} [options]
 * @returns {import('../../../src/types.js').PluginDescriptor}
 */
export default function createPlugin (options = {}) {
  return {
    noKeyItemText: 'No features displayed',
    ...options,
    id: 'mapKey',
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-map-key-plugin" */ './manifest.js')).manifest
      return module
    }
  }
}
