import { createSnapInteraction } from './snapInteraction.js'

const setup = ({ indicatorActive = true } = {}) => {
  const engine = { query: jest.fn(() => ({ type: 'vertex', coord: [9, 9] })) }
  const indicator = { show: jest.fn(), hide: jest.fn() }
  const interaction = createSnapInteraction(engine, indicator, 12, () => indicatorActive)
  const fire = (type, coordinate = [1, 1]) => {
    const event = { type, coordinate }
    const result = interaction.handleEvent(event)
    return { event, result }
  }
  return { engine, indicator, interaction, fire }
}

test('always lets the event continue to other interactions', () => {
  const { fire } = setup()
  expect(fire('pointermove').result).toBe(true)
  expect(fire('wheel').result).toBe(true)
})

test('does nothing while inactive', () => {
  const { engine, interaction, fire } = setup()
  interaction.setActive(false)
  const { event } = fire('pointermove')
  expect(engine.query).not.toHaveBeenCalled()
  expect(event.coordinate).toEqual([1, 1])
})

test('rewrites the event coordinate to a copy of the snap candidate for all pointer gestures', () => {
  const { engine, fire } = setup()
  for (const type of ['pointermove', 'pointerdrag', 'pointerdown', 'pointerup', 'singleclick', 'click']) {
    const { event } = fire(type)
    expect(event.coordinate).toEqual([9, 9])
    expect(event.coordinate).not.toBe(engine.query.mock.results.at(-1).value.coord) // copy, not shared
  }
})

test('the indicator follows free mouse movement only', () => {
  const { engine, indicator, fire } = setup()
  fire('pointermove')
  expect(indicator.show).toHaveBeenCalledWith([9, 9], 'vertex')

  engine.query.mockReturnValue(null)
  fire('pointermove')
  expect(indicator.hide).toHaveBeenCalledTimes(1)

  engine.query.mockReturnValue({ type: 'edge', coord: [5, 5] })
  fire('pointerdrag')
  expect(indicator.hide).toHaveBeenCalledTimes(2) // hidden during drags
  fire('singleclick')
  expect(indicator.show).toHaveBeenCalledTimes(1) // clicks never touch the indicator
})

test('the indicator stays untouched during pointermove when the indicator is gated off', () => {
  const { indicator, fire } = setup({ indicatorActive: false })
  const { event } = fire('pointermove')
  expect(event.coordinate).toEqual([9, 9]) // snapping still applies
  expect(indicator.show).not.toHaveBeenCalled()
  expect(indicator.hide).not.toHaveBeenCalled()
})

test('leaving the map hides the indicator without querying; unrelated events are ignored', () => {
  const { engine, indicator, fire } = setup()
  fire('pointerout')
  expect(indicator.hide).toHaveBeenCalled()
  fire('wheel')
  expect(engine.query).not.toHaveBeenCalled()
})
