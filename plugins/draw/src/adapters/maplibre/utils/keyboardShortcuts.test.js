import { isInteractiveElementFocused, isUndoShortcut, sharedKeyboardHandlers } from './keyboardShortcuts.js'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isInteractiveElementFocused', () => {
  test('returns false when nothing has been focused (activeElement defaults to body)', () => {
    expect(document.activeElement).toBe(document.body)
    expect(isInteractiveElementFocused({ container: document.createElement('div') })).toBe(false)
  })

  test('returns false for focus inside the container', () => {
    const container = document.createElement('div')
    const button = document.createElement('button')
    container.appendChild(button)
    document.body.appendChild(container)
    button.focus()
    expect(isInteractiveElementFocused({ container })).toBe(false)
  })

  test('returns true for an interactive tag focused outside the container', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(isInteractiveElementFocused({ container: document.createElement('div') })).toBe(true)
  })

  test('returns true for a tabindex/contentEditable element focused outside the container', () => {
    const div = document.createElement('div')
    div.tabIndex = 0
    document.body.appendChild(div)
    div.focus()
    expect(isInteractiveElementFocused({ container: document.createElement('div') })).toBe(true)
  })

  test('a missing container is treated as outside — falls through to the tag/attribute check', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(isInteractiveElementFocused({ container: undefined })).toBe(true)
  })
})

describe('isUndoShortcut', () => {
  test('true for Cmd+Z or Ctrl+Z without shift', () => {
    expect(isUndoShortcut({ key: 'z', metaKey: true })).toBe(true)
    expect(isUndoShortcut({ key: 'z', ctrlKey: true })).toBe(true)
  })

  test('falsy when shift is also held, the key is wrong, or no modifier is held', () => {
    expect(isUndoShortcut({ key: 'z', metaKey: true, shiftKey: true })).toBe(false)
    expect(isUndoShortcut({ key: 'y', metaKey: true })).toBe(false)
    expect(isUndoShortcut({ key: 'z' })).toBeFalsy()
  })
})

describe('sharedKeyboardHandlers.handleUndoShortcut', () => {
  test('swallows the default/propagation and delegates to handleUndo', () => {
    const handleUndo = jest.fn()
    const e = { preventDefault: jest.fn(), stopPropagation: jest.fn() }
    sharedKeyboardHandlers.handleUndoShortcut.call({ handleUndo }, {}, e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(e.stopPropagation).toHaveBeenCalled()
    expect(handleUndo).toHaveBeenCalled()
  })

  test('is ignored while typing in an input/textarea', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const handleUndo = jest.fn()
    const e = { preventDefault: jest.fn(), stopPropagation: jest.fn() }
    sharedKeyboardHandlers.handleUndoShortcut.call({ handleUndo }, {}, e)
    expect(handleUndo).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })
})
