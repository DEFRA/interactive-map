import { debounce } from './debounce.js'

jest.useFakeTimers()

describe('debounce', () => {
  test('invokes the function after the delay with the latest arguments', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a')
  })

  test('collapses rapid calls into a single trailing invocation', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced(1)
    debounced(2)
    debounced(3)
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
  })

  test('cancel prevents a pending invocation', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('x')
    debounced.cancel()
    jest.advanceTimersByTime(100)

    expect(fn).not.toHaveBeenCalled()
  })
})
