import { focusAfterPanelClose } from './focusAfterPanelClose.js'

describe('focusAfterPanelClose', () => {
  let viewportRef

  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb())
    viewportRef = { current: { focus: jest.fn() } }
  })

  afterEach(() => {
    window.requestAnimationFrame.mockRestore()
    document.body.innerHTML = ''
  })

  it('focuses the triggering element when it is still on the page', () => {
    const triggeringElement = document.body.appendChild(document.createElement('button'))
    const focusSpy = jest.spyOn(triggeringElement, 'focus')
    focusAfterPanelClose({ triggeringElement, viewportRef, interfaceType: 'keyboard' })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: false })
    expect(viewportRef.current.focus).not.toHaveBeenCalled()
  })

  it('focuses the viewport when the triggering element has left the page', () => {
    const triggeringElement = document.createElement('button')
    focusAfterPanelClose({ triggeringElement, viewportRef, interfaceType: 'pointer' })
    expect(viewportRef.current.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('focuses the viewport when there is no triggering element', () => {
    focusAfterPanelClose({ viewportRef, interfaceType: 'keyboard' })
    expect(viewportRef.current.focus).toHaveBeenCalledWith({ preventScroll: false })
  })

  it('waits for the next frame before moving focus', () => {
    window.requestAnimationFrame.mockImplementation(() => 1)
    focusAfterPanelClose({ viewportRef, interfaceType: 'keyboard' })
    expect(viewportRef.current.focus).not.toHaveBeenCalled()
  })
})
