import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { CrossHair } from './CrossHair.jsx'
import { useCrossHair } from '../../hooks/useCrossHairAPI.js'

jest.mock('../../hooks/useCrossHairAPI', () => ({ useCrossHair: jest.fn() }))
jest.mock('../../store/configContext', () => ({ useConfig: jest.fn(() => ({ id: 'testApp' })) }))

describe('CrossHair', () => {
  const crossHairRef = React.createRef()

  // Positioning/visibility/sizing all live on the outer <button> (tabIndex="-1" — a real,
  // accessibility-focusable-but-not-Tab-stop element, so coordinate-based AT like Voice Control
  // can find it, at the right geometry); the SVG itself is a plain, unstyled child.
  const renderWith = (overrides = {}) => {
    useCrossHair.mockReturnValue({
      crossHairRef,
      crossHair: {
        isVisible: true,
        isPinnedToMap: true,
        state: 'active',
        ...overrides
      }
    })
    const { container } = render(<CrossHair />)
    return { button: container.querySelector('button'), svg: container.querySelector('svg') }
  }

  it('renders visible active marker when pinned', () => {
    const { button, svg } = renderWith()
    const path = svg.querySelector('path')

    expect(button).toHaveClass('im-c-cross-hair-button')
    expect(button).toHaveStyle({
      position: 'absolute',
      left: 0,
      top: 0,
      display: 'block'
    })
    expect(path.getAttribute('d')).toContain('M5.035 20H1v-2h4.035C5.525') // active path
  })

  it('positions marker at center when not pinned', () => {
    const { button } = renderWith({ isPinnedToMap: false })

    expect(button).toHaveStyle({
      left: '50%',
      top: '50%'
    })
  })

  // Fully removed from the layout/accessibility tree when hidden, not just faded — so Voice
  // Control's Show Names never puts a "Target" label over nothing. Its real route back is
  // opening MoveControls (a normal, always-visible button), not re-discovering this element.
  it('hides marker when not visible', () => {
    const { button } = renderWith({ isVisible: false })
    expect(button).toHaveStyle({ display: 'none' })
  })

  it('invokes crossHair.activate() on click, for Voice Control / mouse / touch activation', () => {
    const activate = jest.fn()
    const { button } = renderWith({ activate })
    fireEvent.click(button)
    expect(activate).toHaveBeenCalledTimes(1)
  })

  it('does not throw when clicked with no activate() assigned', () => {
    const { button } = renderWith()
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('is not a Tab stop, but is a real button for coordinate-based AT (e.g. Voice Control) to find', () => {
    const { button } = renderWith()
    expect(button.tabIndex).toBe(-1)
    expect(button.tagName).toBe('BUTTON')
  })

  it.each([
    ['inactive', 'M5.035 20H1v-2h4.035a13.98'],
    [undefined, 'M5.035 20H1v-2h4.035C5.525'] // fallback to active
  ])('renders correct path for state=%s', (state, expected) => {
    const { svg } = renderWith({ state })
    expect(svg.querySelector('path').getAttribute('d')).toContain(expected)
  })
})
