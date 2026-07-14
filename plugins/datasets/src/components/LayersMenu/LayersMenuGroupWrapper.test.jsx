import { render, screen } from '@testing-library/react'
import { LayersMenuGroupWrapper } from './LayersMenuGroupWrapper'

const child = <span data-testid='child'>Child content</span>

describe('LayersMenuGroupWrapper', () => {
  describe('without a groupLabel', () => {
    it('renders children directly without a wrapping div', () => {
      const { getByTestId, container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(getByTestId('child')).toBeTruthy()
      expect(container.querySelector('.govuk-form-group')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is absent', () => {
      const { container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is an empty string', () => {
      const { container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: '' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })
  })

  describe('with a groupLabel', () => {
    it('renders the outer wrapper with the correct classes', () => {
      const { container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</LayersMenuGroupWrapper>
      )
      const wrapper = container.querySelector('.govuk-form-group.im-c-datasets-layers-group')
      expect(wrapper).toBeTruthy()
    })

    it('renders a fieldset with the correct class', () => {
      const { container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(container.querySelector('fieldset.im-c-datasets-layers-group__fieldset')).toBeTruthy()
    })

    it('renders the groupLabel as the legend text', () => {
      render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(screen.getByText('My Group')).toBeTruthy()
    })

    it('renders the legend with the correct class', () => {
      const { container } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(container.querySelector('legend.im-c-datasets-layers-group__legend')).toBeTruthy()
    })

    it('renders children inside the fieldset', () => {
      const { getByTestId } = render(
        <LayersMenuGroupWrapper menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</LayersMenuGroupWrapper>
      )
      expect(getByTestId('child')).toBeTruthy()
    })
  })
})
