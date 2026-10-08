export class MapProvider {
  _notImplemented (method) {
    throw new Error(`${this.name} must implement ${method}()`)
  }

  isBaseMapReady () {
    this._notImplemented('isBaseMapReady')
  }

  /**
   * Rasterises and registers each symbol's normal, active and selected images with the map.
   * Images already registered are reused.
   *
   * @param {Object[]} symbolConfigs - symbol styles (symbol/symbolSvgContent plus token overrides)
   * @param {Object} mapStyle - current map style config
   * @param {Object} symbolRegistry
   * @param {number} [pixelRatio] - defaults to the map's current pixel ratio
   * @returns {Promise<void>}
   */
  addSymbolsToMap () {
    this._notImplemented('addSymbolsToMap')
  }

  /**
   * Rasterises and registers each pattern's image with the map. Images already registered are
   * reused.
   *
   * @param {Object[]} patternConfigs - pattern styles (fillPattern/fillPatternSvgContent plus colours)
   * @param {string} mapStyleId
   * @param {Object} patternRegistry
   * @param {number} [pixelRatio] - defaults to the map's current pixel ratio
   * @returns {Promise<void>}
   */
  addPatternsToMap () {
    this._notImplemented('addPatternsToMap')
  }

  /**
   * The imageId of a registered symbol's active (keyboard cursor) variant.
   *
   * @param {string} normalImageId
   * @returns {string|null}
   */
  getActiveSymbolImageId () {
    this._notImplemented('getActiveSymbolImageId')
  }

  /**
   * The imageId of a registered symbol's selected variant.
   *
   * @param {string} normalImageId
   * @returns {string|null}
   */
  getSelectedSymbolImageId () {
    this._notImplemented('getSelectedSymbolImageId')
  }
}
