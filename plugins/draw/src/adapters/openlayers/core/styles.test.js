import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import Feature from 'ol/Feature.js'
import { createStyles } from './styles.js'
import { SIZES } from '../defaults.js'
import { polygonFeature, lineFeature } from '../__helpers__/harness.js'

const colors = {
  editStroke: '#e5',
  editFill: '#ef',
  editVertex: '#ev',
  editMidpoint: '#em',
  editActive: '#ea',
  editHalo: '#eh',
  invalidStroke: '#is',
  splitValid: '#sv',
  splitInvalid: '#si',
  shapeStroke: '#ss',
  shapeFill: '#sf',
  strokeWidth: 3,
  mapStyleId: 'road'
}

const styles = createStyles(colors)

// Records each canvas fill as { radius, fillStyle } so ring order/colours can be asserted
const fakeCanvas = () => {
  const fills = []
  const ctx = {
    fillStyle: null,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn((cx, cy, radius) => { ctx.lastArc = { cx, cy, radius } }),
    fill: jest.fn(() => fills.push({ ...ctx.lastArc, fillStyle: ctx.fillStyle }))
  }
  return { ctx, fills }
}

describe('handle styles', () => {
  test('vertex and midpoint handles use the configured radii and colours', () => {
    expect(styles.vertexStyle.getImage().getRadius()).toBe(SIZES.vertexRadius)
    expect(styles.vertexStyle.getImage().getFill().getColor()).toBe(colors.editVertex)
    expect(styles.midpointStyle.getImage().getRadius()).toBe(SIZES.midpointRadius)
    expect(styles.midpointStyle.getImage().getFill().getColor()).toBe(colors.editMidpoint)
  })

  test('selected handles render three concentric rings in one canvas pass, scaled by pixelRatio', () => {
    const { ctx, fills } = fakeCanvas()
    styles.selectedVertexStyle.getRenderer()([10, 20], { context: ctx, pixelRatio: 2 })
    expect(fills).toEqual([
      { cx: 10, cy: 20, radius: (SIZES.vertexHaloRadius + 3) * 2, fillStyle: colors.editActive },
      { cx: 10, cy: 20, radius: SIZES.vertexHaloRadius * 2, fillStyle: colors.editHalo },
      { cx: 10, cy: 20, radius: SIZES.vertexRadius * 2, fillStyle: colors.editVertex }
    ])

    const midpoint = fakeCanvas()
    styles.selectedMidpointStyle.getRenderer()([0, 0], { context: midpoint.ctx, pixelRatio: 1 })
    expect(midpoint.fills.map(f => f.radius)).toEqual(
      [SIZES.midpointHaloRadius + 3, SIZES.midpointHaloRadius, SIZES.midpointRadius])
    expect(midpoint.fills[2].fillStyle).toBe(colors.editMidpoint)
  })

  test('the edited feature gets the edit stroke and fill', () => {
    expect(styles.editFeatureStyle.getStroke().getColor()).toBe(colors.editStroke)
    expect(styles.editFeatureStyle.getFill().getColor()).toBe(colors.editFill)
  })

  test('the invalid edited feature gets a dashed stroke and no fill', () => {
    expect(styles.editFeatureStyleInvalid.getStroke().getColor()).toBe(colors.invalidStroke)
    expect(styles.editFeatureStyleInvalid.getStroke().getLineDash()).toEqual([2, 4])
    expect(styles.editFeatureStyleInvalid.getFill()).toBeNull()
  })
})

describe('sketch styles while drawing', () => {
  const polygonStyleFn = styles.createSketchStyle('Polygon')

  test('the cursor-follow point renders nothing; the companion line gets stroke only', () => {
    expect(polygonStyleFn(new Feature(new Point([0, 0])))).toEqual([])
    expect(polygonStyleFn(new Feature(new LineString([[0, 0], [1, 1]])))).toHaveLength(1)
  })

  test('the invalid sketch renders a dashed line in the invalid colour with no fill', () => {
    const invalidStyleFn = styles.createSketchStyle('Polygon', true)
    const [lineStyle] = invalidStyleFn(new Feature(new LineString([[0, 0], [1, 1]])))
    expect(lineStyle.getStroke().getColor()).toBe(colors.invalidStroke)
    expect(lineStyle.getStroke().getLineDash()).toEqual([2, 4])
    expect(lineStyle.getFill()).toBeNull()
  })

  test('a splitter-tagged sketch renders the split colours (valid solid, invalid dashed), overriding invalid', () => {
    const valid = lineFeature([[0, 0], [1, 1]])
    valid.set('splitter', 'valid')
    const [validStyle] = styles.createSketchStyle('LineString')(valid)
    expect(validStyle.getStroke().getColor()).toBe(colors.splitValid)
    expect(validStyle.getStroke().getLineDash()).toBeNull()

    const invalid = lineFeature([[0, 0], [1, 1]])
    invalid.set('splitter', 'invalid')
    const [invalidStyle] = styles.createSketchStyle('LineString', true)(invalid)
    expect(invalidStyle.getStroke().getColor()).toBe(colors.splitInvalid)
    expect(invalidStyle.getStroke().getLineDash()).toEqual([2, 4])
  })

  test('placed vertices render with the shared vertex image on a reused MultiPoint', () => {
    const sketch = polygonFeature([[0, 0], [10, 0], [5, 5], [0, 0]]) // 2 placed + rubber + closing
    const [, vertexStyle] = polygonStyleFn(sketch)
    expect(vertexStyle.getImage()).toBe(styles.vertexStyle.getImage())
    const geometry = vertexStyle.getGeometry()(sketch)
    expect(geometry.getCoordinates()).toEqual([[0, 0], [10, 0]])
    expect(vertexStyle.getGeometry()(sketch)).toBe(geometry) // instance reused per render

    const empty = lineFeature([[9, 9]]) // rubber band only — nothing placed
    expect(styles.createSketchStyle('LineString')(empty)[1].getGeometry()(empty)).toBeNull()
  })
})

describe('createFeatureStyle (inactive shapes)', () => {
  const styleFor = (properties) => styles.createFeatureStyle()({ getProperties: () => properties })[0]

  test('falls back to the configured shape colours', () => {
    const style = styleFor({})
    expect(style.getStroke().getColor()).toBe(colors.shapeStroke)
    expect(style.getStroke().getWidth()).toBe(colors.strokeWidth)
    expect(style.getFill().getColor()).toBe(colors.shapeFill)
  })

  test('per-feature properties override, and map-style-specific properties win overall', () => {
    const style = styleFor({ stroke: '#f1', fill: '#f2', strokeWidth: 7, strokeRoad: '#r1', fillRoad: '#r2' })
    expect(style.getStroke().getColor()).toBe('#r1')
    expect(style.getFill().getColor()).toBe('#r2')
    expect(style.getStroke().getWidth()).toBe(7)

    expect(styleFor({ stroke: '#f1' }).getStroke().getColor()).toBe('#f1')
  })

  test('without a map style id only the generic properties apply', () => {
    const plain = createStyles({ ...colors, mapStyleId: null })
    const style = plain.createFeatureStyle()({ getProperties: () => ({ strokeRoad: '#r1' }) })[0]
    expect(style.getStroke().getColor()).toBe(colors.shapeStroke)
  })
})
