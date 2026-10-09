// Attributions.test.jsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Attributions } from './Attributions'
import { useApp } from '../../store/appContext'
import { useMap } from '../../store/mapContext'

// mock hooks
jest.mock('../../store/appContext', () => ({
  useApp: jest.fn()
}))

jest.mock('../../store/mapContext', () => ({
  useMap: jest.fn()
}))

describe('Attributions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when mapStyle is missing', () => {
    useApp.mockReturnValue({ breakpoint: 'desktop' })
    useMap.mockReturnValue({ mapStyle: null })

    const { container } = render(<Attributions />)
    expect(container.firstChild).toBeNull()
  })

  it('renders attribution when not on mobile', () => {
    useApp.mockReturnValue({ breakpoint: 'desktop' })
    useMap.mockReturnValue({ mapStyle: { attribution: '<span>© Test</span>' } })

    render(<Attributions />)
    expect(screen.getByText('© Test')).toBeInTheDocument()
  })

  it('does not render when breakpoint is mobile', () => {
    useApp.mockReturnValue({ breakpoint: 'mobile' })
    useMap.mockReturnValue({ mapStyle: { attribution: '<span>© Test</span>' } })

    const { container } = render(<Attributions />)
    expect(container.firstChild).toBeNull()
  })

  it('renders on mobile when the style opts in via showAttributionOnMobile', () => {
    useApp.mockReturnValue({ breakpoint: 'mobile' })
    useMap.mockReturnValue({ mapStyle: { attribution: '<span>© Test</span>', showAttributionOnMobile: true } })

    render(<Attributions />)
    expect(screen.getByText('© Test')).toBeInTheDocument()
  })
})
