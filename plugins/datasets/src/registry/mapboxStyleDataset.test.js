import { Dataset } from './dataset.js'
import { MapboxStyleDataset } from './mapboxStyleDataset.js'
import { datasetRegistry } from './datasetRegistry.js'
import { attachGlobalState } from './globalDataset.js'
import { hashString } from '../../../../src/utils/patternUtils.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
jest.mock('./datasetRegistry.js')

const globalState = {
  opacityMode: 'dataset',
  opacity: 1,
  visible: true
}

describe('MapboxStyleDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachCreateDataset(def => new MapboxStyleDataset(def))
  })

  describe('_hiddenFeaturesIdExpression', () => {
    it('uses get(idProperty) when idProperty is set', () => {
      const dataset = new MapboxStyleDataset({ idProperty: 'ref' })
      expect(dataset._hiddenFeaturesIdExpression).toEqual(['to-string', ['get', 'ref']])
    })

    it('uses the feature id when idProperty is not set', () => {
      const dataset = new MapboxStyleDataset({})
      expect(dataset._hiddenFeaturesIdExpression).toEqual(['to-string', ['id']])
    })

    it('uses the dynamicGeoJSON hiddenFeaturesIdExpression when the dataset is dynamic', () => {
      const dataset = new MapboxStyleDataset({ dynamicGeoJSON: { idProperty: 'ref' } })
      expect(dataset._hiddenFeaturesIdExpression).toEqual(['to-string', ['get', 'ref']])
    })
  })

  describe('filter', () => {
    it('returns null when there is no filter and no hidden features', () => {
      const dataset = new MapboxStyleDataset({})
      expect(dataset.filter).toBeNull()
    })

    it('returns its own filter expression directly when it is the only filter', () => {
      const dataset = new MapboxStyleDataset({ filter: ['==', ['get', 'type'], 'foo'] })
      expect(dataset.filter).toEqual(['==', ['get', 'type'], 'foo'])
    })

    it('returns the hidden features filter directly when it is the only filter', () => {
      const dataset = new MapboxStyleDataset({ hiddenFeatures: [1, 2] })
      expect(dataset.filter).toEqual(['!', ['in', ['to-string', ['id']], ['literal', ['1', '2']]]])
    })

    it('combines its own filter and the hidden features filter with "all"', () => {
      const dataset = new MapboxStyleDataset({ filter: ['==', ['get', 'type'], 'foo'], hiddenFeatures: [5] })
      expect(dataset.filter).toEqual([
        'all',
        ['==', ['get', 'type'], 'foo'],
        ['!', ['in', ['to-string', ['id']], ['literal', ['5']]]]
      ])
    })

    it('includes the parent filter for a sublayer', () => {
      const parentDef = { id: 'parent', filter: ['==', ['get', 'cat'], 'a'] }
      const childDef = { id: 'child', parentId: 'parent', filter: ['==', ['get', 'sub'], 'b'] }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new MapboxStyleDataset(childDef).filter).toEqual(['all', parentDef.filter, childDef.filter])
    })
  })

  describe('sourceId', () => {
    it('returns a tiles-based id for an array of tiles URLs', () => {
      const dataset = new MapboxStyleDataset({ id: 'ds', tiles: ['https://example.com/{z}/{x}/{y}'] })
      expect(dataset.sourceId).toBe(`tiles-${hashString('https://example.com/{z}/{x}/{y}')}`)
    })

    it('returns geojson-{hash} for a static string geojson url', () => {
      const dataset = new MapboxStyleDataset({ id: 'ds', geojson: 'https://example.com/data.geojson' })
      expect(dataset.sourceId).toBe(`geojson-${hashString('https://example.com/data.geojson')}`)
    })

    it('returns geojson-{id} for an inline geojson object', () => {
      const dataset = new MapboxStyleDataset({ id: 'ds', geojson: { type: 'FeatureCollection', features: [] } })
      expect(dataset.sourceId).toBe('geojson-ds')
    })

    it('returns source-{id} when there are no tiles and no geojson', () => {
      const dataset = new MapboxStyleDataset({ id: 'ds' })
      expect(dataset.sourceId).toBe('source-ds')
    })

    it('returns the parent sourceId for a sublayer', () => {
      const parentDef = { id: 'parent', geojson: { type: 'FeatureCollection', features: [] } }
      const childDef = { id: 'child', parentId: 'parent' }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(new MapboxStyleDataset(childDef).sourceId).toBe('geojson-parent')
    })
  })

  describe('leafLayerIds / layerIds', () => {
    it('leafLayerIds defaults to an empty array on the base class', () => {
      expect(new MapboxStyleDataset({ id: 'ds' }).leafLayerIds).toEqual([])
    })

    it('layerIds returns leafLayerIds for a dataset with no sublayers', () => {
      class FakeAdapterDataset extends MapboxStyleDataset {
        get leafLayerIds () { return [this.id] }
      }
      const dataset = new FakeAdapterDataset({ id: 'ds' })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    it('layerIds flattens leafLayerIds from all sublayers', () => {
      class FakeAdapterDataset extends MapboxStyleDataset {
        get leafLayerIds () { return this.hasSublayers ? [] : [this.id] }
      }
      // attachCreateDataset mutates the shared datasetRegistry singleton, which beforeEach's
      // attach() call alone does not reset — restore this file's own default afterward so this
      // doesn't leak into other tests in this file.
      try {
        datasetRegistry.attachCreateDataset(def => new FakeAdapterDataset(def))
        const parentDef = { id: 'parent', sublayerIds: ['child-a', 'child-b'] }
        const childA = { id: 'child-a', parentId: 'parent' }
        const childB = { id: 'child-b', parentId: 'parent' }
        datasetRegistry.attach({ parent: parentDef, 'child-a': childA, 'child-b': childB })
        expect(datasetRegistry.getDataset('parent').layerIds).toEqual(['child-a', 'child-b'])
      } finally {
        datasetRegistry.attachCreateDataset(def => new MapboxStyleDataset(def))
      }
    })
  })

  // getLayersWithValue's recursion/condition-gating/aggregation logic is shared by all three
  // methods below and adapter-agnostic — leafLayerIds itself is the one adapter-specific
  // override point (see leafLayerIds/layerIds tests above), so a minimal one-id-per-leaf
  // FakeAdapterDataset is enough to exercise it directly, without depending on a real adapter's
  // test suite (e.g. MapLibreDataset's) to incidentally cover this shared behaviour.
  describe('getLayersWithVisibility / getLayersWithOpacity / getLayersWithFilters', () => {
    class FakeAdapterDataset extends MapboxStyleDataset {
      get leafLayerIds () { return this.hasSublayers ? [] : [this.id] }
    }

    beforeEach(() => {
      // visibility/opacity both fold in global state (see globalDataset.js) — set explicitly
      // here rather than relying on whatever an earlier test in this file last left it as.
      attachGlobalState(globalState)
      datasetRegistry.attachCreateDataset(def => new FakeAdapterDataset(def))
    })

    afterEach(() => {
      datasetRegistry.attachCreateDataset(def => new MapboxStyleDataset(def))
    })

    describe('getLayersWithVisibility', () => {
      it('returns an entry with layerIds and visibility for each sublayer', () => {
        // A sublayer's own visible getter requires the parent to also be visible (see
        // dataset.js's visible getter) — visible: true here is the parent's own, needed for
        // childA to end up genuinely visible below.
        const parentDef = { id: 'parent', visible: true, sublayerIds: ['child-a', 'child-b'] }
        const childA = { id: 'child-a', parentId: 'parent', visible: true }
        const childB = { id: 'child-b', parentId: 'parent', visible: false }
        datasetRegistry.attach({ parent: parentDef, 'child-a': childA, 'child-b': childB })
        expect(datasetRegistry.getDataset('parent').getLayersWithVisibility()).toEqual([
          { layerIds: ['child-a'], visibility: 'visible' },
          { layerIds: ['child-b'], visibility: 'none' }
        ])
      })
    })

    describe('getLayersWithOpacity', () => {
      it('returns layerIds and opacity for a top-level dataset with no sublayers', () => {
        const dataset = new FakeAdapterDataset({ id: 'ds', style: { opacity: 0.4 } })
        expect(dataset.getLayersWithOpacity()).toEqual([{ layerIds: ['ds'], opacity: 0.4 }])
      })

      it('returns layerIds and opacity for each sublayer', () => {
        const parentDef = { id: 'parent', sublayerIds: ['child-a', 'child-b'] }
        const childA = { id: 'child-a', parentId: 'parent', style: { opacity: 0.75 } }
        const childB = { id: 'child-b', parentId: 'parent' }
        datasetRegistry.attach({ parent: parentDef, 'child-a': childA, 'child-b': childB })
        expect(datasetRegistry.getDataset('parent').getLayersWithOpacity()).toEqual([
          { layerIds: ['child-a'], opacity: 0.75 },
          { layerIds: ['child-b'], opacity: 1 }
        ])
      })

      it('skips a sublayer that contributes no leaf layers, rather than pushing undefined', () => {
        // Models an adapter (like OpenLayersDataset today) where some styles aren't renderable
        // yet — such a sublayer's leafLayerIds is empty, and that must not surface as an
        // undefined entry in the result.
        class UnevenAdapterDataset extends MapboxStyleDataset {
          get leafLayerIds () { return this.style?.renderable ? [this.id] : [] }
        }
        datasetRegistry.attachCreateDataset(def => new UnevenAdapterDataset(def))
        const parentDef = { id: 'parent', sublayerIds: ['child-renderable', 'child-unsupported'] }
        const childRenderable = { id: 'child-renderable', parentId: 'parent', style: { renderable: true, opacity: 0.5 } }
        const childUnsupported = { id: 'child-unsupported', parentId: 'parent', style: { opacity: 0.9 } }
        datasetRegistry.attach({ parent: parentDef, 'child-renderable': childRenderable, 'child-unsupported': childUnsupported })
        expect(datasetRegistry.getDataset('parent').getLayersWithOpacity()).toEqual([
          { layerIds: ['child-renderable'], opacity: 0.5 }
        ])
      })
    })

    describe('getLayersWithFilters', () => {
      it('returns an empty array when there are no hidden features and no sublayers', () => {
        const dataset = new FakeAdapterDataset({ id: 'ds' })
        expect(dataset.getLayersWithFilters()).toEqual([])
      })

      it('returns an entry with layerIds and filter when the dataset has hidden features', () => {
        const dataset = new FakeAdapterDataset({ id: 'ds', hiddenFeatures: [1, 2] })
        expect(dataset.getLayersWithFilters()).toEqual([{
          layerIds: ['ds'],
          filter: ['!', ['in', ['to-string', ['id']], ['literal', ['1', '2']]]]
        }])
      })

      it('includes sublayer entries when a sublayer has hidden features', () => {
        const parentDef = { id: 'parent', sublayerIds: ['child'] }
        const childDef = { id: 'child', parentId: 'parent', hiddenFeatures: [7] }
        datasetRegistry.attach({ parent: parentDef, child: childDef })
        expect(datasetRegistry.getDataset('parent').getLayersWithFilters()).toEqual([{
          layerIds: ['child'],
          filter: ['!', ['in', ['to-string', ['id']], ['literal', ['7']]]]
        }])
      })

      it('returns an empty array when sublayers exist but none have hidden features', () => {
        const parentDef = { id: 'parent', sublayerIds: ['child'] }
        const childDef = { id: 'child', parentId: 'parent' }
        datasetRegistry.attach({ parent: parentDef, child: childDef })
        expect(datasetRegistry.getDataset('parent').getLayersWithFilters()).toEqual([])
      })
    })
  })

  it('extends the base Dataset class', () => {
    expect(new MapboxStyleDataset({})).toBeInstanceOf(Dataset)
  })
})
