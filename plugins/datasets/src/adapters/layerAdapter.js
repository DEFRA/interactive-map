export class LayerAdapter {
  attachDynamicSources (dynamicSources) {
    this._dynamicSources = dynamicSources
  }

  get dynamicSources () {
    return this._dynamicSources
  }
}
