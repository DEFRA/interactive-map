import { renderedBoxes, topColHeight } from './renderedBoxes.js'

const BOX = { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40 }

// jsdom gives every element empty client rects, i.e. the same as display:none
const child = ({ isShown = true, hidden = false, className = '' } = {}) => {
  const element = document.createElement('div')
  element.hidden = hidden
  element.className = className
  if (isShown) {
    element.getClientRects = () => [BOX]
    element.getBoundingClientRect = () => BOX
  }
  return element
}

const parentOf = (...children) => {
  const parent = document.createElement('div')
  children.forEach(item => parent.appendChild(item))
  return parent
}

describe('renderedBoxes', () => {
  it('returns the boxes of shown children', () => {
    expect(renderedBoxes(parentOf(child(), child()))).toEqual([BOX, BOX])
  })

  it('skips hidden children and children with no box', () => {
    expect(renderedBoxes(parentOf(child({ hidden: true }), child({ isShown: false })))).toEqual([])
  })

  it('looks inside control wrappers, which have no box of their own', () => {
    const wrapper = parentOf(child())
    wrapper.className = 'im-c-control-wrapper'
    expect(renderedBoxes(parentOf(wrapper))).toEqual([BOX])
  })

  it('returns nothing for a missing element', () => {
    expect(renderedBoxes(null)).toEqual([])
  })
})

describe('topColHeight', () => {
  const col = (...children) => {
    const element = parentOf(...children)
    Object.defineProperty(element, 'offsetHeight', { value: 48 })
    return element
  }

  it('is the column height when anything in it shows', () => {
    expect(topColHeight(col(child({ hidden: true }), child()))).toBe(48)
  })

  it('is 0 when everything in it is hidden, ignoring its padding', () => {
    expect(topColHeight(col(child({ hidden: true })))).toBe(0)
  })

  it('is the column height when it has no children', () => {
    expect(topColHeight(col())).toBe(48)
  })
})
