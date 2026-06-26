import { EsriDataset } from './esriDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'

jest.mock('../../../registry/datasetRegistry.js')

const MAP_STYLE = { id: 'outdoor' }

describe('EsriDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachMapStyle(MAP_STYLE)
    datasetRegistry.attachCreateDataset(def => new EsriDataset(def))
    datasetRegistry.mockExtend({
      // applyLayerPaintProperties
      'esri-fill-stroke': { id: 'esri-fill-stroke', style: { fill: '#ff0000', stroke: '#0000ff' } },
      'esri-stroke-only': { id: 'esri-stroke-only', style: { stroke: '#0000ff' } },
      'esri-fill-only': { id: 'esri-fill-only', style: { fill: '#ff0000' } },
      'esri-bare': { id: 'esri-bare' },
      // esriGroupId — parent owns the id, child inherits it
      'esri-group': { id: 'esri-group', esriGroupId: 'group-123', sublayerIds: ['esri-child'] },
      'esri-child': { id: 'esri-child', parentId: 'esri-group' },
      // esriGroupId — explicitly set to null (distinct from undefined)
      'esri-group-null': { id: 'esri-group-null', esriGroupId: null },
      // useServerStyle
      'esri-server-style': { id: 'esri-server-style', esriUseServerStyle: true },
      'esri-no-server': { id: 'esri-no-server' }
    })
  })

  // ─── applyLayerPaintProperties ──────────────────────────────────────────────

  describe('applyLayerPaintProperties', () => {
    it('adds line-color when the dataset has a stroke style', () => {
      const ds = datasetRegistry.getDataset('esri-stroke-only')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBeDefined()
    })

    it('resolves line-color against the current map style id', () => {
      const ds = datasetRegistry.getDataset('esri-stroke-only')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBe('#0000ff')
    })

    it('adds fill-color when the dataset has a fill style', () => {
      const ds = datasetRegistry.getDataset('esri-fill-only')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['fill-color']).toBeDefined()
    })

    it('resolves fill-color against the current map style id', () => {
      const ds = datasetRegistry.getDataset('esri-fill-only')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['fill-color']).toBe('#ff0000')
    })

    it('adds both line-color and fill-color when the dataset has stroke and fill', () => {
      const ds = datasetRegistry.getDataset('esri-fill-stroke')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBe('#0000ff')
      expect(paint['fill-color']).toBe('#ff0000')
    })

    it('does not add line-color or fill-color when the dataset has neither', () => {
      const ds = datasetRegistry.getDataset('esri-bare')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBeUndefined()
      expect(paint['fill-color']).toBeUndefined()
    })

    it('returns the paint object', () => {
      const ds = datasetRegistry.getDataset('esri-fill-stroke')
      const paint = { existing: true }
      expect(ds.applyLayerPaintProperties(paint)).toBe(paint)
    })
  })

  // ─── esriGroupId ────────────────────────────────────────────────────────────

  describe('esriGroupId', () => {
    it('returns the esriGroupId from the dataset definition when set', () => {
      const ds = datasetRegistry.getDataset('esri-group')
      expect(ds.esriGroupId).toBe('group-123')
    })

    it('returns null when esriGroupId is explicitly null', () => {
      const ds = datasetRegistry.getDataset('esri-group-null')
      expect(ds.esriGroupId).toBeNull()
    })

    it('inherits esriGroupId from the parent when own esriGroupId is undefined', () => {
      const child = datasetRegistry.getDataset('esri-child')
      expect(child.esriGroupId).toBe('group-123')
    })

    it('returns undefined when esriGroupId is not set and there is no parent', () => {
      const ds = datasetRegistry.getDataset('esri-bare')
      expect(ds.esriGroupId).toBeUndefined()
    })
  })

  // ─── useServerStyle ─────────────────────────────────────────────────────────

  describe('useServerStyle', () => {
    it('returns true when esriUseServerStyle is true', () => {
      expect(datasetRegistry.getDataset('esri-server-style').useServerStyle).toBe(true)
    })

    it('returns false when esriUseServerStyle is not set', () => {
      expect(datasetRegistry.getDataset('esri-no-server').useServerStyle).toBe(false)
    })
  })
})
