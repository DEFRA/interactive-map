import React, { useState, useCallback } from 'react'

const toTabId = (name) => `im-c-tabs-tab-${name.toLowerCase().replaceAll(/\s+/g, '-')}`
const toPanelId = (name) => `im-c-tabs-panel-${name.toLowerCase().replaceAll(/\s+/g, '-')}`

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Tabs = ({ tabs, defaultTab }) => { // NOSONAR: project does not use PropTypes
  const names = tabs.map(t => t.name)
  const [activeTab, setActiveTab] = useState(defaultTab ?? names[0])

  const activateTab = useCallback((name) => {
    setActiveTab(name)
    document.getElementById(toTabId(name))?.focus()
  }, [])

  const handleKeyDown = useCallback((e) => {
    const idx = names.indexOf(activeTab)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      activateTab(names[(idx + 1) % names.length])
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      activateTab(names[(idx - 1 + names.length) % names.length])
    } else if (e.key === 'Home') {
      e.preventDefault()
      activateTab(names[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      activateTab(names.at(-1))
    } else {
      // no action
    }
  }, [names, activeTab, activateTab])

  const activeContent = tabs.find(t => t.name === activeTab)?.content

  return (
    <div className='im-c-tabs'>
      <div role='tablist' className='im-c-tabs__list'>
        {tabs.map(({ name }) => (
          <button
            key={name}
            id={toTabId(name)}
            role='tab'
            aria-selected={activeTab === name}
            aria-controls={toPanelId(name)}
            tabIndex={activeTab === name ? 0 : -1}
            className='im-c-tabs__tab'
            onClick={() => activateTab(name)}
            onKeyDown={handleKeyDown}
          >
            <span className='im-c-tabs__label'>{name}</span>
          </button>
        ))}
      </div>
      <div
        id={toPanelId(activeTab)}
        role='tabpanel'
        aria-labelledby={toTabId(activeTab)}
        tabIndex={-1} // nosonar — panel has no focusable children; -1 per ARIA tabs pattern (AT reads via role/aria-labelledby)
        className='im-c-tabs__panel'
      >
        {activeContent}
      </div>
    </div>
  )
}
