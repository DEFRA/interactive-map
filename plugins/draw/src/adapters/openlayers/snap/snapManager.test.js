import { createSnapManager } from './snapManager.js'
import { createSnapEngine } from './snapEngine.js'
import { createSnapIndicator } from './snapIndicator.js'
import { createSnapInteraction } from './snapInteraction.js'
import { createFakeMap } from '../__helpers__/harness.js'

jest.mock('./snapEngine.js', () => ({
  createSnapEngine: jest.fn(() => ({ query: jest.fn(() => null), setLayers: jest.fn() }))
}))
jest.mock('./snapIndicator.js', () => ({
  createSnapIndicator: jest.fn(() => ({ show: jest.fn(), hide: jest.fn(), updateColors: jest.fn(), remove: jest.fn() }))
}))
jest.mock('./snapInteraction.js', () => ({
  createSnapInteraction: jest.fn(() => ({ setActive: jest.fn() }))
}))

const setup = () => {
  const map = createFakeMap()
  const snap = createSnapManager(map, ['boundaries'], { snapVertex: '#sv' }, 12)
  const engine = createSnapEngine.mock.results.at(-1).value
  const indicator = createSnapIndicator.mock.results.at(-1).value
  const interaction = createSnapInteraction.mock.results.at(-1).value
  return { map, snap, engine, indicator, interaction }
}

afterEach(() => jest.clearAllMocks())

test('no snap layers configured means no snap manager at all', () => {
  expect(createSnapManager(createFakeMap(), null, {}, 12)).toBeNull()
  expect(createSnapManager(createFakeMap(), [], {}, 12)).toBeNull()
})

test('starts attached to the map but inactive, matching the initial snap-off UI state', () => {
  const { map, snap, interaction } = setup()
  expect(map.interactions).toContain(interaction)
  expect(interaction.setActive).toHaveBeenCalledWith(false)
  expect(snap.snapRadius).toBe(12)
})

describe('apply', () => {
  test('returns the coordinate untouched while snap is off', () => {
    const { snap, engine } = setup()
    expect(snap.apply([1, 2])).toEqual([1, 2])
    expect(engine.query).not.toHaveBeenCalled()
  })

  test('snaps to a candidate and shows the indicator, or hides it on a miss', () => {
    const { snap, engine, indicator } = setup()
    snap.setActive(true)
    engine.query.mockReturnValue({ type: 'vertex', coord: [9, 9] })
    expect(snap.apply([8, 8])).toEqual([9, 9])
    expect(indicator.show).toHaveBeenCalledWith([9, 9], 'vertex')

    engine.query.mockReturnValue(null)
    expect(snap.apply([1, 2])).toEqual([1, 2])
    expect(indicator.hide).toHaveBeenCalled()
  })
})

test('deactivating snap or the indicator hides the circle; the interaction reads indicator state live', () => {
  const { snap, indicator, interaction } = setup()
  const isIndicatorActive = createSnapInteraction.mock.calls.at(-1)[3]
  snap.setIndicatorActive(true)
  expect(isIndicatorActive()).toBe(true)
  snap.setIndicatorActive(false)
  expect(isIndicatorActive()).toBe(false)
  expect(indicator.hide).toHaveBeenCalledTimes(1)

  snap.setActive(false)
  expect(interaction.setActive).toHaveBeenLastCalledWith(false)
  expect(indicator.hide).toHaveBeenCalledTimes(2)
})

test('setSnapLayers forwards new layers, falling back to the configured set when cleared', () => {
  const { snap, engine } = setup()
  snap.setSnapLayers(['other'])
  expect(engine.setLayers).toHaveBeenCalledWith(['other'])
  snap.setSnapLayers(null)
  expect(engine.setLayers).toHaveBeenCalledWith(['boundaries'])
  snap.setSnapLayers(undefined)
  expect(engine.setLayers).toHaveBeenLastCalledWith(['boundaries'])
})

test('reattach re-adds the interaction so it processes pointer events first', () => {
  const { map, snap, interaction } = setup()
  map.interactions.push({ id: 'draw' }) // a mode was just added
  snap.reattach()
  expect(map.removeInteraction).toHaveBeenCalledWith(interaction)
  expect(map.interactions.at(-1)).toBe(interaction)
})

test('colour updates and explicit hides reach the indicator; destroy removes interaction and indicator', () => {
  const { map, snap, indicator, interaction } = setup()
  snap.hideIndicator()
  expect(indicator.hide).toHaveBeenCalled()
  snap.updateColors({ snapVertex: '#new' })
  expect(indicator.updateColors).toHaveBeenCalledWith({ snapVertex: '#new' })
  snap.destroy()
  expect(map.removeInteraction).toHaveBeenCalledWith(interaction)
  expect(indicator.remove).toHaveBeenCalled()
})
