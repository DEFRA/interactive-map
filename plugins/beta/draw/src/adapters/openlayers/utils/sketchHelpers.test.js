import Polygon from 'ol/geom/Polygon.js'
import LineString from 'ol/geom/LineString.js'
import { getPlacedSketchCoords, getLastPlacedSketchCoord } from './sketchHelpers.js'

test('strips the rubber band (and the closing coord for polygons) to expose placed vertices', () => {
  const poly = new Polygon([[[0, 0], [10, 0], [5, 5], [0, 0]]]) // 2 placed + rubber + closing
  expect(getPlacedSketchCoords(poly)).toEqual([[0, 0], [10, 0]])
  expect(getLastPlacedSketchCoord(poly)).toEqual([10, 0])

  const line = new LineString([[0, 0], [10, 0], [5, 5]]) // 2 placed + rubber
  expect(getPlacedSketchCoords(line)).toEqual([[0, 0], [10, 0]])
  expect(getLastPlacedSketchCoord(line)).toEqual([10, 0])
})

test('empty or rubber-band-only sketches have no placed vertices', () => {
  expect(getPlacedSketchCoords(new Polygon([]))).toEqual([])
  expect(getLastPlacedSketchCoord(new LineString([]))).toBeNull()
})
