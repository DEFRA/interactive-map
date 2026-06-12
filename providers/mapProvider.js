export class MapProvider {
  isBaseMapReady () {
    throw new Error(this.name + ' must implement isBaseMapReady()')
  }
}
