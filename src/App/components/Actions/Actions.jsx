import React from 'react'
import { useApp } from '../../store/appContext'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Actions = ({ children }) => {
  const { openPanels, panelConfig, breakpoint } = useApp()

  const childArray = React.Children.toArray(children)
  const visibleChild = childArray.find(c => c.props?.isHidden === false)

  // If a panel exists above we need so css adjustment
  const isBottomSlotUsed = Object.keys(openPanels).some(panelId => {
    return breakpoint === 'mobile' && panelConfig[panelId]?.[breakpoint]?.slot === 'bottom'
  })

  const className = [
    'im-c-panel',
    'im-c-actions',
    isBottomSlotUsed && 'im-c-actions--border-top'
  ].filter(Boolean).join(' ')

  return (
    <div className={className} style={visibleChild ? undefined : { display: 'none' }}>
      {children}
    </div>
  )
}
