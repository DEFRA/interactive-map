import { createUndoStack } from './undoStack.js'

describe('createUndoStack', () => {
  test('push adds an operation and reports the new length', () => {
    const onChange = jest.fn()
    const stack = createUndoStack(onChange)

    stack.push({ id: 1 })
    stack.push({ id: 2 })

    expect(stack.length).toBe(2)
    expect(onChange).toHaveBeenNthCalledWith(1, 1)
    expect(onChange).toHaveBeenNthCalledWith(2, 2)
  })

  test('pop returns and removes the last operation, reporting the length', () => {
    const onChange = jest.fn()
    const stack = createUndoStack(onChange)
    stack.push({ id: 1 })
    onChange.mockClear()

    const op = stack.pop()

    expect(op).toEqual({ id: 1 })
    expect(stack.length).toBe(0)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  test('pop on an empty stack returns undefined and reports zero', () => {
    const onChange = jest.fn()
    const stack = createUndoStack(onChange)

    expect(stack.pop()).toBeUndefined()
    expect(onChange).toHaveBeenCalledWith(0)
  })

  test('clear empties the stack and reports zero', () => {
    const onChange = jest.fn()
    const stack = createUndoStack(onChange)
    stack.push({ id: 1 })
    stack.push({ id: 2 })
    onChange.mockClear()

    stack.clear()

    expect(stack.length).toBe(0)
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
