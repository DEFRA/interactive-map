import { closeApp } from './closeApp'

describe('closeApp', () => {
  it('calls handleExitClick', () => {
    const handleExitClickMock = jest.fn()
    closeApp('map-123', handleExitClickMock)
    expect(handleExitClickMock).toHaveBeenCalled()
  })
})
