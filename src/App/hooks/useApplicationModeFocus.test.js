import { renderHook } from '@testing-library/react'
import { useApplicationModeFocus } from './useApplicationModeFocus.js'
import { useApp } from '../store/appContext.js'

jest.mock('../store/appContext.js', () => ({ useApp: jest.fn() }))

describe('useApplicationModeFocus', () => {
  let app, viewport, button

  // jsdom has no layout, so stand in for rendered (has client rects) vs hidden (none)
  const setRendered = (el, rendered) => { el.getClientRects = () => (rendered ? [{}] : []) }

  beforeEach(() => {
    app = document.createElement('div')
    viewport = document.createElement('div')
    viewport.tabIndex = 0
    button = document.createElement('button')
    app.append(viewport, button)
    document.body.append(app)
    setRendered(viewport, true)
    viewport.focus = jest.fn()
  })

  afterEach(() => { document.body.innerHTML = '' })

  const render = (applicationModeEntries) => {
    useApp.mockReturnValue({ applicationModeEntries, layoutRefs: { appContainerRef: { current: app }, viewportRef: { current: viewport } } })
    return renderHook(() => useApplicationModeFocus())
  }

  it('moves focus to the viewport when the focused element has been hidden', () => {
    button.focus()
    setRendered(button, false)
    render([{ id: 'draw', include: [], exclude: null }])
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('leaves focus alone when the focused element is still shown', () => {
    button.focus()
    setRendered(button, true)
    render([{ id: 'draw', include: [], exclude: null }])
    expect(viewport.focus).not.toHaveBeenCalled()
  })

  it('leaves focus alone when it is outside the app', () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    setRendered(outside, false)
    render([{ id: 'draw', include: [], exclude: null }])
    expect(viewport.focus).not.toHaveBeenCalled()
  })
})
