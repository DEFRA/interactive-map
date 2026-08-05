import { deriveModifyOp, buildModifyCondition, createModifyInteraction } from './modifyInteraction.js'
import { createFakeMap, polygonFeature } from '../__helpers__/harness.js'

const RING = [[0, 0], [10, 0], [10, 10], [0, 0]]

describe('deriveModifyOp', () => {
  const prev = [[0, 0], [10, 0], [10, 10]]

  test('a moved vertex becomes a move_vertex op with its previous coordinate', () => {
    expect(deriveModifyOp(prev, [[0, 0], [12, 2], [10, 10]]))
      .toEqual({ type: 'move_vertex', vertexIndex: 1, previousCoord: [10, 0] })
  })

  test('a grown array becomes an insert_vertex op at the first differing index', () => {
    expect(deriveModifyOp(prev, [[0, 0], [5, 5], [10, 0], [10, 10]]))
      .toEqual({ type: 'insert_vertex', vertexIndex: 1 })
    expect(deriveModifyOp(prev, [...prev, [9, 9]]))
      .toEqual({ type: 'insert_vertex', vertexIndex: 3 })
  })

  test('no coordinate change or a shrunk array yields no op', () => {
    expect(deriveModifyOp(prev, prev.map(c => [...c]))).toBeNull()
    expect(deriveModifyOp(prev, prev.slice(0, 2))).toBeNull()
  })
})

describe('buildModifyCondition', () => {
  const event = (x, y) => ({ originalEvent: { clientX: x, clientY: y } })
  const conditionFor = (interfaceType) => buildModifyCondition({
    map: createFakeMap(),
    getState: () => ({ interfaceType, vertices: [[10, 10]], midpoints: [[50, 50]] })
  })

  test('activates on a vertex or midpoint handle but not on empty map', () => {
    const condition = conditionFor('mouse')
    expect(condition(event(11, 11))).toBe(true)
    expect(condition(event(51, 49))).toBe(true)
    expect(condition(event(200, 200))).toBe(false)
  })

  test('never activates for the touch interface', () => {
    expect(conditionFor('touch')(event(11, 11))).toBe(false)
  })
})

describe('createModifyInteraction', () => {
  const setup = (interfaceType = 'mouse') => {
    const map = createFakeMap()
    const state = { interfaceType, vertices: [[0, 0], [10, 0]], midpoints: [] }
    const onModifyEnd = jest.fn()
    const modify = createModifyInteraction({ map, olFeature: polygonFeature(RING), getState: () => state, onModifyEnd })
    return { map, state, onModifyEnd, modify, interaction: map.interactions[0] }
  }

  test('reports a completed drag with the vertices snapshotted at drag start', () => {
    const { state, onModifyEnd, interaction } = setup()
    interaction.dispatchEvent({ type: 'modifystart' })
    state.vertices = [[5, 5], [10, 0]] // drag mutates state via geometry change
    interaction.dispatchEvent({ type: 'modifyend' })
    expect(onModifyEnd).toHaveBeenCalledWith([[0, 0], [10, 0]])
  })

  test('touch drags are ignored entirely', () => {
    const { onModifyEnd, interaction } = setup('touch')
    interaction.dispatchEvent({ type: 'modifystart' })
    interaction.dispatchEvent({ type: 'modifyend' })
    expect(onModifyEnd).not.toHaveBeenCalled()
  })

  test('vertex handles are rendered by the vertex layer, not by Modify itself', () => {
    const { interaction } = setup()
    expect(interaction.getOverlay().getStyleFunction()()).toEqual([])
  })

  test('destroy removes the interaction from the map', () => {
    const { map, modify, interaction } = setup()
    modify.destroy()
    expect(map.removeInteraction).toHaveBeenCalledWith(interaction)
  })
})
