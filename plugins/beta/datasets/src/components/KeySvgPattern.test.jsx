import { render } from '@testing-library/react'
import { KeySvgPattern } from './KeySvgPattern'

import { getKeyPatternPaths } from '../../../../../src/utils/patternUtils.js'

jest.mock('../../../../../src/utils/patternUtils.js', () => ({
  getKeyPatternPaths: jest.fn(() => ({ border: '<rect/>', content: '<path/>' }))
}))

const defaultProps = {
  fillPattern: 'dots',
  patternRegistry: { id: 'registry' },
  mapStyle: { id: 'default' }
}

beforeEach(() => {
  getKeyPatternPaths.mockReturnValue({ border: '<rect/>', content: '<path/>' })
})

describe('KeySvgPattern', () => {
  it('renders an svg element', () => {
    const { container } = render(<KeySvgPattern {...defaultProps} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('calls getKeyPatternPaths with props, the mapStyle id, and the patternRegistry', () => {
    render(<KeySvgPattern {...defaultProps} />)
    expect(getKeyPatternPaths).toHaveBeenCalledWith(defaultProps, 'default', defaultProps.patternRegistry)
  })

  it('renders two g elements for border and content', () => {
    const { container } = render(<KeySvgPattern {...defaultProps} />)
    const groups = container.querySelectorAll('g')
    expect(groups.length).toBe(2)
  })

  it('applies a translate transform to the content group', () => {
    const { container } = render(<KeySvgPattern {...defaultProps} />)
    const groups = container.querySelectorAll('g')
    const contentGroup = groups[1]
    expect(contentGroup.getAttribute('transform')).toMatch(/^translate\(/)
  })

  it('injects the border html into the first g element', () => {
    getKeyPatternPaths.mockReturnValue({ border: '<circle id="border-el"/>', content: '' })
    const { container } = render(<KeySvgPattern {...defaultProps} />)
    expect(container.querySelector('#border-el')).toBeTruthy()
  })

  it('injects the content html into the second g element', () => {
    getKeyPatternPaths.mockReturnValue({ border: '', content: '<circle id="content-el"/>' })
    const { container } = render(<KeySvgPattern {...defaultProps} />)
    expect(container.querySelector('#content-el')).toBeTruthy()
  })
})
