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
      'esri-bare': { id: 'esri-bare' },
      // esriGroupId — parent owns the id, child inherits it
      'esri-group': { id: 'esri-group', esriGroupId: 'group-123', sublayerIds: ['esri-child'] },
      'esri-child': { id: 'esri-child', parentId: 'esri-group' },
      // useServerStyle
      'esri-server-style': { id: 'esri-server-style', esriUseServerStyle: true }
    })
  })

  // ─── applyLayerPaintProperties ──────────────────────────────────────────────

  describe('applyLayerPaintProperties', () => {
    it('adds both line-color and fill-color when the dataset has stroke and fill', () => {
      const ds = datasetRegistry.getDataset('land-covers-other')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBe('#1565C0')
      expect(paint['fill-color']).toBe('rgba(0,0,255,0.1)')
    })

    it('does not add line-color or fill-color when the dataset has neither', () => {
      const ds = datasetRegistry.getDataset('esri-bare')
      const paint = {}
      ds.applyLayerPaintProperties(paint)
      expect(paint['line-color']).toBeUndefined()
      expect(paint['fill-color']).toBeUndefined()
    })
  })

  // ─── esriGroupId ────────────────────────────────────────────────────────────

  describe('esriGroupId', () => {
    it('returns the esriGroupId from the dataset definition when set', () => {
      const ds = datasetRegistry.getDataset('esri-group')
      expect(ds.esriGroupId).toBe('group-123')
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
      expect(datasetRegistry.getDataset('land-covers-other').useServerStyle).toBe(false)
    })
  })
})
