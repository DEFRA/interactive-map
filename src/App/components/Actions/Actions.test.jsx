import React from 'react'
import { render, screen } from '@testing-library/react'
import { Actions } from './Actions.jsx'
import * as AppContext from '../../store/appContext' // import the module to mock

// Simple child component to handle isHidden
const TestChild = ({ isHidden, children, ...props }) => <div {...props}>{children}</div>

describe('Actions component', () => {
  const mockUseApp = {
    openPanels: {},
    panelConfig: {},
    breakpoint: 'mobile'
  }

  beforeEach(() => {
    jest.spyOn(AppContext, 'useApp').mockReturnValue(mockUseApp)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the correct slot-based class', () => {
    render(<Actions slot='actions'>Content</Actions>)
    const container = screen.getByText('Content').closest('div')
    expect(container).toHaveClass('im-c-panel', 'im-c-actions')
  })

  it('adds the border class if a bottom slot panel is open', () => {
    mockUseApp.openPanels = { key: {} }
    mockUseApp.panelConfig = { key: { mobile: { slot: 'bottom' } } }

    render(<Actions slot='actions'>Content</Actions>)
    const container = screen.getByText('Content').closest('div')
    expect(container).toHaveClass('im-c-actions--border-top')
  })

  it('renders children correctly', () => {
    render(
      <Actions slot='actions'>
        <div data-testid='child'>Child Content</div>
      </Actions>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('child').textContent).toBe('Child Content')
  })

  it('hides the container when all children are hidden', () => {
    render(
      <Actions slot="actions">
        <TestChild isHidden={true} data-testid="child1">Child 1</TestChild>
        <TestChild isHidden={true} data-testid="child2">Child 2</TestChild>
      </Actions>
    )
    const container = screen.getByTestId('child1').closest('.im-c-actions')
    expect(container).toHaveStyle('display: none')
  })

  it('shows the container when at least one child is visible', () => {
    render(
      <Actions slot="actions">
        <TestChild isHidden={false} data-testid="child1">Child 1</TestChild>
        <TestChild isHidden={true} data-testid="child2">Child 2</TestChild>
      </Actions>
    )
    const container = screen.getByTestId('child1').closest('.im-c-actions')
    expect(container).not.toHaveStyle('display: none')
  })
})
