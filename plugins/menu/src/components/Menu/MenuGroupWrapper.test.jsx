import { render, screen } from '@testing-library/react'
import { MenuGroupWrapper } from './MenuGroupWrapper.jsx'

const child = <span data-testid='child'>Child content</span>

describe('MenuGroupWrapper', () => {
  describe('without a groupLabel', () => {
    it('renders children directly without a wrapping div', () => {
      const { getByTestId, container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1' }}>{child}</MenuGroupWrapper>
      )
      expect(getByTestId('child')).toBeTruthy()
      expect(container.querySelector('.govuk-form-group')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is absent', () => {
      const { container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1' }}>{child}</MenuGroupWrapper>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is an empty string', () => {
      const { container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: '' }}>{child}</MenuGroupWrapper>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })
  })

  describe('with a groupLabel', () => {
    it('renders the outer wrapper with the correct classes', () => {
      const { container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</MenuGroupWrapper>
      )
      const wrapper = container.querySelector('.govuk-form-group.im-c-menu-layers-group')
      expect(wrapper).toBeTruthy()
    })

    it('renders a fieldset with the correct class', () => {
      const { container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</MenuGroupWrapper>
      )
      expect(container.querySelector('fieldset.im-c-menu-layers-group__fieldset')).toBeTruthy()
    })

    it('renders the groupLabel as the legend text', () => {
      render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</MenuGroupWrapper>
      )
      expect(screen.getByText('My Group')).toBeTruthy()
    })

    it('renders the legend with the correct class', () => {
      const { container } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</MenuGroupWrapper>
      )
      expect(container.querySelector('legend.im-c-menu-layers-group__legend')).toBeTruthy()
    })

    it('renders children inside the fieldset', () => {
      const { getByTestId } = render(
        <MenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</MenuGroupWrapper>
      )
      expect(getByTestId('child')).toBeTruthy()
    })
  })
})
