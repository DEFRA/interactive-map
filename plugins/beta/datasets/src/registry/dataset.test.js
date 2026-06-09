import { Dataset } from './dataset.js'
import { datasetRegistry } from './datasetRegistry.js'
import { attachGlobalState } from './globalDataset.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('./datasetRegistry.js')

const globalState = {
  opacityMode: 'dataset',
  opacity: 1,
  visible: true
}
describe('Dataset class', () => {
  describe('isSublayer', () => {
    it('returns false for a top-level dataset', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.isSublayer).toBe(false)
    })

    it('returns true for a sublayer', () => {
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      expect(dataset.isSublayer).toBe(true)
    })
  })

  describe('hasSublayers', () => {
    it('returns true for a dataset that has sublayers', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.hasSublayers).toBe(true)
    })

    it('returns false for a dataset with no sublayers', () => {
      const dataset = datasetRegistry.getDataset('hedge-control')
      expect(dataset.hasSublayers).toBe(false)
    })

    it('returns false for a dataset with an empty sublayerIds array', () => {
      const dataset = new Dataset({ sublayerIds: [] })
      expect(dataset.hasSublayers).toBe(false)
    })
  })

  describe('sublayers', () => {
    it('returns undefined for a dataset with no sublayerIds', () => {
      const dataset = datasetRegistry.getDataset('hedge-control')
      expect(dataset.sublayers).toBeUndefined()
    })

    it('returns a Dataset instance for each sublayer', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.sublayers).toHaveLength(5)
      dataset.sublayers.forEach(s => expect(s).toBeInstanceOf(Dataset))
    })

    it('returns sublayers for historic-monuments', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.sublayers).toHaveLength(3)
      dataset.sublayers.forEach(s => expect(s).toBeInstanceOf(Dataset))
    })
  })

  describe('parent', () => {
    it('returns undefined for a top-level dataset', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.parent).toBeUndefined()
    })

    it('returns a Dataset instance representing the parent for a sublayer', () => {
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      expect(dataset.parent).toBeInstanceOf(Dataset)
    })
  })

  describe('style', () => {
    it('returns the dataset style directly when there is no parent', () => {
      const dataset = new Dataset({ style: { stroke: '#ff0000', fill: 'transparent' } })
      expect(dataset.style).toEqual({ stroke: '#ff0000', fill: 'transparent' })
    })

    it('merges parent style with the sublayer style', () => {
      const parentDef = { id: 'parent', style: { stroke: '#ff0000', strokeWidth: 2 } }
      const childDef = { id: 'child', parentId: 'parent', style: { fill: 'blue' } }
      datasetRegistry.attach({ parent: parentDef, child: childDef })

      const dataset = new Dataset(childDef)
      expect(dataset.style).toMatchObject({ stroke: '#ff0000', strokeWidth: 2, fill: 'blue' })
    })

    it('overrides parent style properties with the sublayer own style', () => {
      const parentDef = { id: 'parent', style: { stroke: '#ff0000' } }
      const childDef = { id: 'child', parentId: 'parent', style: { stroke: '#00ff00' } }
      datasetRegistry.attach({ parent: parentDef, child: childDef })

      const dataset = new Dataset(childDef)
      expect(dataset.style.stroke).toBe('#00ff00')
    })

    it('includes symbolDescription in the merged sublayer style', () => {
      const parentDef = { id: 'parent', style: { stroke: '#ff0000' } }
      const childDef = { id: 'child', parentId: 'parent', style: { symbolDescription: 'custom' } }
      datasetRegistry.attach({ parent: parentDef, child: childDef })

      const dataset = new Dataset(childDef)
      expect(dataset.style.symbolDescription).toBe('custom')
    })
  })

  describe('hasCustomVisualStyle', () => {
    it.each([
      ['stroke', { stroke: '#ff0000' }],
      ['fill', { fill: 'transparent' }],
      ['fillPattern', { fillPattern: 'dots' }],
      ['fillPatternSvgContent', { fillPatternSvgContent: '<svg/>' }],
      ['symbol', { symbol: 'square' }],
      ['symbolSvgContent', { symbolSvgContent: '<svg/>' }]
    ])('returns true when style contains %s', (_, style) => {
      expect(new Dataset({ style }).hasCustomVisualStyle).toBe(true)
    })

    it('returns false when style contains no visual style properties', () => {
      const dataset = new Dataset({ style: { symbolBackgroundColor: '#ff0000', strokeWidth: 3 } })
      expect(dataset.hasCustomVisualStyle).toBe(false)
    })

    it('returns false when there is no style', () => {
      const dataset = new Dataset({})
      expect(dataset.hasCustomVisualStyle).toBe(false)
    })
  })

  describe('symbolDescription', () => {
    it("returns the dataset's own symbolDescription", () => {
      const dataset = new Dataset({ style: { symbolDescription: 'a circle' } })
      expect(dataset.symbolDescription).toBe('a circle')
    })

    it('returns undefined when the dataset has a custom visual style but no symbolDescription', () => {
      const dataset = new Dataset({ style: { stroke: '#ff0000' } })
      expect(dataset.symbolDescription).toBeUndefined()
    })

    it('returns undefined when the dataset has no style', () => {
      const dataset = new Dataset({})
      expect(dataset.symbolDescription).toBeUndefined()
    })

    it("inherits the parent's symbolDescription when the sublayer has no custom visual style", () => {
      const parentDef = { id: 'parent', style: { symbolDescription: 'parent symbol' } }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })

      const dataset = new Dataset(childDef)
      expect(dataset.symbolDescription).toBe('parent symbol')
    })

    it('returns undefined when neither the sublayer nor the parent has a symbolDescription', () => {
      const parentDef = { id: 'parent', style: { stroke: '#ff0000' } }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })

      // parent has a custom visual style (stroke) → parent.symbolDescription = undefined
      // child has no visual style → inherits undefined from parent
      const dataset = new Dataset(childDef)
      expect(dataset.symbolDescription).toBeUndefined()
    })
  })

  describe('label', () => {
    it('returns the dataset label', () => {
      const dataset = new Dataset({ label: 'My dataset' })
      expect(dataset.label).toBe('My dataset')
    })

    it('returns undefined when no label is set', () => {
      const dataset = new Dataset({})
      expect(dataset.label).toBeUndefined()
    })
  })

  describe('showInKey', () => {
    it('returns true when showInKey is set on the dataset', () => {
      const dataset = new Dataset({ showInKey: true })
      expect(dataset.showInKey).toBe(true)
    })

    it('returns false when showInKey is not set and there is no parent', () => {
      const dataset = new Dataset({})
      expect(dataset.showInKey).toBe(false)
    })

    it('inherits showInKey from the parent when not set on the sublayer', () => {
      const parentDef = { id: 'parent', showInKey: true, style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).showInKey).toBe(true)
    })

    it('returns false when neither the sublayer nor the parent has showInKey set', () => {
      const parentDef = { id: 'parent', style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).showInKey).toBe(false)
    })
  })

  describe('tiles, geojson, idProperty, parentId', () => {
    it('returns tiles from the definition', () => {
      const tiles = ['https://example.com/{z}/{x}/{y}']
      const dataset = new Dataset({ tiles })
      expect(dataset.tiles).toBe(tiles)
    })

    it('returns geojson from the definition', () => {
      const geojson = { type: 'FeatureCollection', features: [] }
      const dataset = new Dataset({ geojson })
      expect(dataset.geojson).toBe(geojson)
    })

    it('returns idProperty from the definition', () => {
      const dataset = new Dataset({ idProperty: 'gid' })
      expect(dataset.idProperty).toBe('gid')
    })

    it('returns parentId from the definition', () => {
      const dataset = new Dataset({ parentId: 'parent' })
      expect(dataset.parentId).toBe('parent')
    })
  })

  describe('minZoom / maxZoom', () => {
    it('returns minZoom from the definition', () => {
      const dataset = new Dataset({ minZoom: 8 })
      expect(dataset.minZoom).toBe(8)
    })

    it('falls back to the parent minZoom when not set on the sublayer', () => {
      const parentDef = { id: 'parent', minZoom: 10, style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).minZoom).toBe(10)
    })

    it('returns maxZoom from the definition', () => {
      const dataset = new Dataset({ maxZoom: 20 })
      expect(dataset.maxZoom).toBe(20)
    })

    it('falls back to the parent maxZoom when not set on the sublayer', () => {
      const parentDef = { id: 'parent', maxZoom: 22, style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).maxZoom).toBe(22)
    })
  })

  describe('opacity', () => {
    const noOpacity = {
      id: 'noOpacity'
    }
    const noOpacityChild = {
      id: 'noOpacityChild',
      parentId: 'noOpacity'
    }
    const opacityChild4 = {
      id: 'opacityChild4',
      parentId: 'noOpacity',
      style: { opacity: 0.4 }
    }
    const zeroOpacity = {
      id: 'zeroOpacity',
      style: { opacity: 0 }
    }
    const opacity8 = {
      id: 'opacity8',
      style: { opacity: 0.8 }
    }
    const opacity8Child = {
      id: 'opacity8Child',
      parentId: 'opacity8',
      style: { opacity: 0.4 }
    }
    const opacity8ChildNoOpacity = {
      id: 'opacity8ChildNoOpacity',
      parentId: 'opacity8'
    }
    beforeEach(() => {
      datasetRegistry.attach({
        zeroOpacity,
        noOpacity,
        noOpacityChild,
        opacity8,
        opacity8Child,
        opacity8ChildNoOpacity,
        opacityChild4
      })
    })

    describe('with opacityMode set to "dataset"', () => {
      it('returns global opacity when no opacity', () => {
        expect(datasetRegistry.getDataset('noOpacity').opacity).toBe(1)
      })

      it('returns global opacity when no opacity is set in child or parent', () => {
        expect(datasetRegistry.getDataset('noOpacityChild').opacity).toBe(1)
      })

      it('returns the specified opacity when opacity is set in child only', () => {
        expect(datasetRegistry.getDataset('opacityChild4').opacity).toBe(0.4)
      })

      it('returns the specified opacity for a topLevel Dataset', () => {
        expect(datasetRegistry.getDataset('opacity8').opacity).toBe(0.8)
      })

      it('returns the specified opacity when opacity is set in parent only', () => {
        expect(datasetRegistry.getDataset('opacity8ChildNoOpacity').opacity).toBe(0.8)
      })

      it('returns the specified opacity for a child Dataset', () => {
        expect(datasetRegistry.getDataset('opacity8Child').opacity).toBe(0.4)
      })

      it('returns 0 when opacity is explicitly set to 0', () => {
        expect(datasetRegistry.getDataset('zeroOpacity').opacity).toBe(0)
      })
    })

    describe('with opacityMode set to "multiply"', () => {
      beforeEach(() => {
        attachGlobalState({
          ...globalState,
          opacityMode: 'multiply',
          opacity: 0.75
        })
      })

      it('returns global opacity when no opacity', () => {
        expect(datasetRegistry.getDataset('noOpacity').opacity).toBe(0.75)
      })

      it('returns global opacity when no opacity is set in child or parent', () => {
        expect(datasetRegistry.getDataset('noOpacityChild').opacity).toBe(0.75)
      })

      it('returns the multiplied opacity when opacity is set in child only', () => {
        expect(datasetRegistry.getDataset('opacityChild4').opacity).toBe(0.3)
      })

      it('returns the multiplied opacity for a topLevel Dataset', () => {
        // 0.8 (dataset opacity) * 0.75 (global opacity)
        expect(datasetRegistry.getDataset('opacity8').opacity).toBe(0.6)
      })

      it('returns the multiplied opacity for a child Dataset', () => {
        // 0.4 (dataset opacity) * 0.75 (global opacity) * 0.8 (parent dataset opacity)
        expect(datasetRegistry.getDataset('opacity8Child').opacity).toBe(0.24)
      })

      it('returns 0 when opacity is explicitly set to 0', () => {
        expect(datasetRegistry.getDataset('zeroOpacity').opacity).toBe(0)
      })
    })

    describe('with opacityMode set to "global"', () => {
      beforeEach(() => {
        attachGlobalState({
          ...globalState,
          opacityMode: 'global',
          opacity: 0.6
        })
      })

      it('returns the global opacity when no opacity', () => {
        expect(datasetRegistry.getDataset('noOpacity').opacity).toBe(0.6)
      })

      it('returns the global opacity when no opacity is set in child or parent', () => {
        expect(datasetRegistry.getDataset('noOpacityChild').opacity).toBe(0.6)
      })

      it('returns the global opacity for a topLevel Dataset', () => {
        expect(datasetRegistry.getDataset('opacity8').opacity).toBe(0.6)
      })

      it('returns the global opacity for a child Dataset', () => {
        expect(datasetRegistry.getDataset('opacity8Child').opacity).toBe(0.6)
      })

      it('returns global opacity when opacity is explicitly set to 0', () => {
        expect(datasetRegistry.getDataset('zeroOpacity').opacity).toBe(0.6)
      })
    })
  })

  describe('hasDynamicGeoJSON', () => {
    it('returns true when definition has a dynamicGeoJSON object', () => {
      expect(datasetRegistry.getDataset('land-covers').hasDynamicGeoJSON).toBe(true)
    })

    it('returns false  when definition does not have a dynamicGeoJSON object', () => {
      expect(datasetRegistry.getDataset('historic-monuments').hasDynamicGeoJSON).toBe(false)
    })
  })

  describe('hiddenFeatures / hasHiddenFeatures', () => {
    it('returns hiddenFeatures from the definition', () => {
      const dataset = new Dataset({ hiddenFeatures: [1, 2] })
      expect(dataset.hiddenFeatures).toEqual([1, 2])
    })

    it('returns undefined when hiddenFeatures is not set', () => {
      const dataset = new Dataset({})
      expect(dataset.hiddenFeatures).toBeUndefined()
    })

    it('returns true from hasHiddenFeatures when hiddenFeatures is a non-empty array', () => {
      const dataset = new Dataset({ hiddenFeatures: [42] })
      expect(dataset.hasHiddenFeatures).toBe(true)
    })

    it('returns false from hasHiddenFeatures when hiddenFeatures is empty', () => {
      const dataset = new Dataset({ hiddenFeatures: [] })
      expect(dataset.hasHiddenFeatures).toBe(false)
    })

    it('returns false from hasHiddenFeatures when hiddenFeatures is not set', () => {
      const dataset = new Dataset({})
      expect(dataset.hasHiddenFeatures).toBe(false)
    })

    it('returns true from hasHiddenFeatures when the parent has hidden features', () => {
      const parentDef = { id: 'parent', hiddenFeatures: [7], style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).hasHiddenFeatures).toBe(true)
    })
  })

  describe('filter', () => {
    it('returns null', () => {
      const dataset = new Dataset({ filter: ['==', ['get', 'type'], 'foo'] })
      expect(dataset.filter).toBeNull()
    })
  })

  describe('symbolAnchor', () => {
    it('returns symbolAnchor from its own style', () => {
      const dataset = new Dataset({ style: { symbolAnchor: [0.5, 1] } })
      expect(dataset.symbolAnchor).toEqual([0.5, 1])
    })

    it('returns undefined when no symbolAnchor is set and there is no parent', () => {
      const dataset = new Dataset({ style: {} })
      expect(dataset.symbolAnchor).toBeUndefined()
    })

    it('inherits symbolAnchor from the parent when not set on the sublayer', () => {
      const parentDef = { id: 'parent', style: { symbolAnchor: [0.1, 0.9] } }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).symbolAnchor).toEqual([0.1, 0.9])
    })
  })

  describe('sourceLayer', () => {
    it('returns the sourceLayer from a tile-based top-level dataset', () => {
      const dataset = new Dataset({ tiles: ['https://example.com/{z}/{x}/{y}'], sourceLayer: 'my_layer' })
      expect(dataset.sourceLayer).toBe('my_layer')
    })

    it('returns undefined for a geojson dataset with no tiles', () => {
      const dataset = new Dataset({ geojson: { type: 'FeatureCollection', features: [] } })
      expect(dataset.sourceLayer).toBeUndefined()
    })

    it("returns the parent's sourceLayer for a sublayer", () => {
      const parentDef = { id: 'parent', tiles: ['https://example.com/{z}/{x}/{y}'], sourceLayer: 'parent_layer', style: {} }
      const childDef = { id: 'child', parentId: 'parent', style: {} }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new Dataset(childDef).sourceLayer).toBe('parent_layer')
    })
  })
})
