import { useRef } from 'react'
import { render, act } from '@testing-library/react'
import { useRampOrientation } from './useRampOrientation.js'

// Each character measures 10px wide
const measureText = jest.fn(text => ({ width: text.length * 10 }))
jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ font: '', measureText })

let resizeCallback
let observe
let disconnect

const TestRamp = ({ labels, isRamp = true, width, padding = 0 }) => {
  const listRef = useRef(null)
  const setList = (list) => {
    if (list) {
      Object.defineProperty(list, 'clientWidth', { configurable: true, get: () => width })
    }
    listRef.current = list
  }
  const orientation = useRampOrientation(listRef, labels, isRamp, false)
  return (
    <dl ref={setList} data-orientation={orientation} style={{ paddingLeft: `${padding}px`, paddingRight: `${padding}px` }}>
      {labels.map(label => <dd key={label} className='im-c-map-key-list__item-label'>{label}</dd>)}
    </dl>
  )
}

const getOrientation = (container) => container.querySelector('dl').dataset.orientation

beforeEach(() => {
  jest.clearAllMocks()
  observe = jest.fn()
  disconnect = jest.fn()
  globalThis.ResizeObserver = jest.fn(callback => {
    resizeCallback = callback
    return { observe, disconnect }
  })
})

afterEach(() => {
  delete globalThis.ResizeObserver
})

describe('useRampOrientation', () => {
  it('is horizontal when every label fits in an equal column', () => {
    // 3 columns of 100px; longest label is 90px
    const { container } = render(<TestRamp labels={['Low', 'Medium', 'Very high']} width={300} />)
    expect(getOrientation(container)).toBe('horizontal')
  })

  it('is vertical when any label is wider than its column', () => {
    // 3 columns of 50px; 'Medium' is 60px
    const { container } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={150} />)
    expect(getOrientation(container)).toBe('vertical')
  })

  it('subtracts the list padding from the available width', () => {
    // 2 columns of 30px after 20px padding either side; 'High' is 40px
    const { container } = render(<TestRamp labels={['Low', 'High']} width={100} padding={20} />)
    expect(getOrientation(container)).toBe('vertical')
  })

  it('re-measures when the list resizes', () => {
    const labels = ['Low', 'Medium', 'High']
    const { container, rerender } = render(<TestRamp labels={labels} width={150} />)
    expect(getOrientation(container)).toBe('vertical')
    rerender(<TestRamp labels={labels} width={300} />)
    act(() => resizeCallback())
    expect(getOrientation(container)).toBe('horizontal')
  })

  it('keeps its current orientation while the list has no width', () => {
    const { container } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={0} />)
    expect(getOrientation(container)).toBe('horizontal')
  })

  it('does not measure or observe when the group is not a ramp', () => {
    const { container } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={150} isRamp={false} />)
    expect(getOrientation(container)).toBe('horizontal')
    expect(measureText).not.toHaveBeenCalled()
    expect(globalThis.ResizeObserver).not.toHaveBeenCalled()
  })

  it('still measures when ResizeObserver is unavailable', () => {
    delete globalThis.ResizeObserver
    const { container } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={150} />)
    expect(getOrientation(container)).toBe('vertical')
  })

  describe('when web fonts load', () => {
    let resolveFonts
    let rejectFonts

    beforeEach(() => {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: { ready: new Promise((resolve, reject) => { resolveFonts = resolve; rejectFonts = reject }) }
      })
    })

    afterEach(() => {
      delete document.fonts
    })

    it('re-measures', async () => {
      const labels = ['Low', 'Medium', 'High']
      const { container, rerender } = render(<TestRamp labels={labels} width={150} />)
      expect(getOrientation(container)).toBe('vertical')
      rerender(<TestRamp labels={labels} width={300} />)
      await act(async () => resolveFonts())
      expect(getOrientation(container)).toBe('horizontal')
    })

    it('ignores a font loading failure', async () => {
      const { container } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={150} />)
      measureText.mockClear()
      await act(async () => rejectFonts(new Error('font failed')))
      expect(measureText).not.toHaveBeenCalled()
      expect(getOrientation(container)).toBe('vertical')
    })

    it('does not measure after unmount', async () => {
      const { unmount } = render(<TestRamp labels={['Low', 'Medium', 'High']} width={150} />)
      unmount()
      measureText.mockClear()
      await act(async () => resolveFonts())
      expect(measureText).not.toHaveBeenCalled()
    })
  })

  it('stays horizontal when a canvas context is unavailable', () => {
    // A fresh copy of the module, so its cached measuring context is unset. The pure entry point
    // doesn't register cleanup hooks, which can't be added from inside a test.
    jest.isolateModules(() => {
      const { renderHook } = require('@testing-library/react/pure')
      const { useRampOrientation: isolatedUseRampOrientation } = require('./useRampOrientation.js')
      HTMLCanvasElement.prototype.getContext.mockReturnValueOnce(null)
      const list = document.createElement('dl')
      list.innerHTML = '<dd class="im-c-map-key-list__item-label">Medium</dd>'
      Object.defineProperty(list, 'clientWidth', { get: () => 10 })
      const { result, unmount } = renderHook(() => isolatedUseRampOrientation({ current: list }, ['Medium'], true, false))
      expect(result.current).toBe('horizontal')
      expect(measureText).not.toHaveBeenCalled()
      unmount()
    })
  })

  it('stops observing on unmount', () => {
    const { unmount } = render(<TestRamp labels={['Low']} width={150} />)
    expect(observe).toHaveBeenCalled()
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
