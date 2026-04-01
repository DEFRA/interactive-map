import { BUILT_IN_PATTERNS } from '../config/patternConfig.js'

const patterns = new Map()

export const patternRegistry = {
  /**
   * Register a named pattern.
   *
   * @param {string} id - Unique pattern name (e.g. 'my-hatch')
   * @param {string} svgContent - Inner SVG path content in a 16×16 coordinate space.
   *   Use {{foreground}} and {{background}} tokens for colour injection.
   */
  register (id, svgContent) {
    patterns.set(id, { id, svgContent })
  },

  /**
   * Retrieve a registered pattern by name.
   *
   * @param {string} id
   * @returns {{ id: string, svgContent: string }|undefined}
   */
  get (id) {
    return patterns.get(id)
  },

  /**
   * Returns all registered patterns.
   *
   * @returns {{ id: string, svgContent: string }[]}
   */
  list () {
    return [...patterns.values()]
  }
}

// Seed built-in patterns
Object.entries(BUILT_IN_PATTERNS).forEach(([id, svgContent]) => {
  patternRegistry.register(id, svgContent)
})
