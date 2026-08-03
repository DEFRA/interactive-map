import React from 'react'
import { useApp } from '../../store/appContext'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Actions = ({ children }) => {
  const { openPanels, panelConfig, breakpoint } = useApp()

  const childArray = React.Children.toArray(children)
  const hasVisibleChild = childArray.some(c => c.props?.isHidden === false && c.props?.variant !== 'touch')

  // If a panel exists above we need so css adjustment
  const isBottomSlotUsed = Object.keys(openPanels).some(panelId => {
    return breakpoint === 'mobile' && panelConfig[panelId]?.[breakpoint]?.slot === 'drawer'
  })

  const className = [
    'im-c-panel',
    'im-c-actions',
    !hasVisibleChild && 'im-c-actions--hidden',
    isBottomSlotUsed && 'im-c-actions--border-top'
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      {children}
    </div>
  )
}
