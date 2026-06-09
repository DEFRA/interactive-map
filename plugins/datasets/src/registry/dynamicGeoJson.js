export class DynamicGeoJson {
  constructor (dynamicGeoJSONDefinition) {
    this.id = dynamicGeoJSONDefinition.id
    this.url = dynamicGeoJSONDefinition.url
    this.transformRequest = dynamicGeoJSONDefinition.transformRequest
    this.maxFeatures = dynamicGeoJSONDefinition.maxFeatures
    this.minZoom = dynamicGeoJSONDefinition.minZoom
    this.idProperty = dynamicGeoJSONDefinition.idProperty
    this.hiddenFeaturesIdExpression = ['to-string', ['get', this.idProperty]]
    this.sourceId = `geojson-dynamic-${this.id}`
    this.source = {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      generateId: true
    }
  }
}
