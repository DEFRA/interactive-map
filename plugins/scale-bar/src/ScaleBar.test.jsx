import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScaleBar } from './ScaleBar.jsx'

describe('ScaleBar', () => {
  const defaultProps = {
    mapState: {
      resolution: 10,
      mapSize: 'medium'
    },
    pluginConfig: {
      units: 'metric'
    }
  }

  const renderScaleBar = (props = {}) => {
    const mergedProps = {
      mapState: { ...defaultProps.mapState, ...props.mapState },
      pluginConfig: { ...defaultProps.pluginConfig, ...props.pluginConfig }
    }
    return render(<ScaleBar {...mergedProps} />)
  }

  describe('rendering', () => {
    it('renders scale bar with label', () => {
      renderScaleBar()

      expect(screen.getByText(/Scale bar:/)).toBeInTheDocument()
    })

    it('displays numeric label', () => {
      const { container } = renderScaleBar()

      const label = container.querySelector('.im-c-scale-bar__label')
      expect(label).toBeInTheDocument()
      expect(label.textContent).toMatch(/\d+/)
    })

    it('applies width style based on scale calculation', () => {
      const { container } = renderScaleBar()

      const scaleBar = container.querySelector('.im-c-scale-bar')
      const style = scaleBar.getAttribute('style')
      expect(style).toMatch(/width:\s*\d+(\.\d+)?px/)
    })
  })

  describe('accessibility', () => {
    it('provides screen reader text for scale bar', () => {
      renderScaleBar()

      expect(screen.getByText('Scale bar:')).toHaveClass('im-u-visually-hidden')
    })

    it('provides full unit name for screen readers', () => {
      renderScaleBar()

      // The full unit (e.g., "metres") should be visually hidden but present
      const hiddenElements = document.querySelectorAll('.im-u-visually-hidden')
      const hasUnitText = Array.from(hiddenElements).some(el =>
        el.textContent.includes('metre') || el.textContent.includes('kilometre')
      )
      expect(hasUnitText).toBe(true)
    })

    it('hides abbreviation from screen readers', () => {
      const { container } = renderScaleBar()

      const abbr = container.querySelector('[aria-hidden="true"]')
      expect(abbr).toBeInTheDocument()
    })
  })

  describe('with no resolution', () => {
    it('renders empty scale bar when resolution is null', () => {
      const { container } = renderScaleBar({
        mapState: { resolution: null, mapSize: 'medium' }
      })

      const scaleBar = container.querySelector('.im-c-scale-bar')
      expect(scaleBar).toHaveStyle({ width: '0px' })
    })

    it('renders empty scale bar when resolution is undefined', () => {
      const { container } = renderScaleBar({
        mapState: { resolution: undefined, mapSize: 'medium' }
      })

      const scaleBar = container.querySelector('.im-c-scale-bar')
      expect(scaleBar).toHaveStyle({ width: '0px' })
    })
  })

  describe('unit systems', () => {
    it('displays metric units', () => {
      renderScaleBar({ pluginConfig: { units: 'metric' } })

      const hiddenElements = document.querySelectorAll('.im-u-visually-hidden')
      const hasMetricUnit = Array.from(hiddenElements).some(el =>
        el.textContent.includes('metre') || el.textContent.includes('kilometre')
      )
      expect(hasMetricUnit).toBe(true)
    })

    it('displays imperial units', () => {
      renderScaleBar({ pluginConfig: { units: 'imperial' } })

      const hiddenElements = document.querySelectorAll('.im-u-visually-hidden')
      const hasImperialUnit = Array.from(hiddenElements).some(el =>
        el.textContent.includes('mile') ||
        el.textContent.includes('yard') ||
        el.textContent.includes('feet') ||
        el.textContent.includes('foot')
      )
      expect(hasImperialUnit).toBe(true)
    })
  })

  describe('map sizes', () => {
    it('renders correctly for small map size', () => {
      const { container } = renderScaleBar({
        mapState: { resolution: 10, mapSize: 'small' }
      })

      const scaleBar = container.querySelector('.im-c-scale-bar')
      expect(scaleBar).toBeInTheDocument()
    })

    it('renders correctly for large map size', () => {
      const { container } = renderScaleBar({
        mapState: { resolution: 10, mapSize: 'large' }
      })

      const scaleBar = container.querySelector('.im-c-scale-bar')
      expect(scaleBar).toBeInTheDocument()
    })
  })
})
