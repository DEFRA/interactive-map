import { merge } from './merge.js'

describe('merge', () => {
  test('warns that it is not yet implemented and passes through the polygons', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const polygons = [{ id: 'p1' }, { id: 'p2' }]

    merge({}, polygons)

    expect(spy).toHaveBeenCalledWith('draw: merge is not yet implemented', polygons)
    spy.mockRestore()
  })
})
