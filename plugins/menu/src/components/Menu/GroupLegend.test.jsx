import { render, screen } from '@testing-library/react'
import { GroupLegend } from './GroupLegend.jsx'

const child = <span data-testid='child'>Child content</span>

describe('GroupLegend', () => {
  describe('without a groupLabel', () => {
    it('renders children directly without a wrapping div', () => {
      const { getByTestId, container } = render(
        <GroupLegend menuGroup={{ id: 'g1' }}>{child}</GroupLegend>
      )
      expect(getByTestId('child')).toBeTruthy()
      expect(container.querySelector('.govuk-form-group')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is absent', () => {
      const { container } = render(
        <GroupLegend menuGroup={{ id: 'g1' }}>{child}</GroupLegend>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })

    it('does not render a fieldset when groupLabel is an empty string', () => {
      const { container } = render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: '' }}>{child}</GroupLegend>
      )
      expect(container.querySelector('fieldset')).toBeNull()
    })
  })

  describe('with a groupLabel', () => {
    it('renders the outer wrapper with the correct classes', () => {
      const { container } = render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</GroupLegend>
      )
      const wrapper = container.querySelector('.govuk-form-group.im-c-menu-layers-group')
      expect(wrapper).toBeTruthy()
    })

    it('renders a fieldset with the correct class', () => {
      const { container } = render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</GroupLegend>
      )
      expect(container.querySelector('fieldset.im-c-menu-layers-group__fieldset')).toBeTruthy()
    })

    it('renders the groupLabel as the legend text', () => {
      render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</GroupLegend>
      )
      expect(screen.getByText('My Group')).toBeTruthy()
    })

    it('renders the legend with the correct class', () => {
      const { container } = render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</GroupLegend>
      )
      expect(container.querySelector('legend.im-c-menu-layers-group__legend')).toBeTruthy()
    })

    it('renders children inside the fieldset', () => {
      const { getByTestId } = render(
        <GroupLegend menuGroup={{ id: 'g1', groupLabel: 'My Group' }}>{child}</GroupLegend>
      )
      expect(getByTestId('child')).toBeTruthy()
    })
  })
})
