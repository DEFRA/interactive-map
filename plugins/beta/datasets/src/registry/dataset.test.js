import { Dataset } from './dataset.js'
import { datasetRegistry } from './datasetRegistry.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('./datasetRegistry.js')

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
})
