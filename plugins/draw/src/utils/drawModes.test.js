import { isShapeDrawMode, isDrawingMode, isEditMode, isCheckedMode, isSessionMode } from './drawModes.js'

const ALL_MODES = ['draw_polygon', 'draw_line', 'draw_point', 'edit_vertex', 'edit_point', 'disabled', 'simple_select', null]

const matching = (predicate) => ALL_MODES.filter(predicate)

describe('drawModes', () => {
  test('isShapeDrawMode — shapes drawn vertex by vertex', () => {
    expect(matching(isShapeDrawMode)).toEqual(['draw_polygon', 'draw_line'])
  })

  test('isDrawingMode — modes that place at the crosshair', () => {
    expect(matching(isDrawingMode)).toEqual(['draw_polygon', 'draw_line', 'draw_point'])
  })

  test('isEditMode — existing features being reshaped', () => {
    expect(matching(isEditMode)).toEqual(['edit_vertex', 'edit_point'])
  })

  test('isCheckedMode — modes with a Done button', () => {
    expect(matching(isCheckedMode)).toEqual(['draw_polygon', 'draw_line', 'edit_vertex', 'edit_point'])
  })

  test('isSessionMode — every active draw/edit session', () => {
    expect(matching(isSessionMode)).toEqual(['draw_polygon', 'draw_line', 'draw_point', 'edit_vertex', 'edit_point'])
  })
})
