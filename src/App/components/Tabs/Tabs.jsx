import React, { useState, useCallback } from 'react'
import { useConfig } from '../../store/configContext'

// Prefixed with the app's own id (not the im-c- BEM prefix, which is for CSS classes, not DOM
// ids — see Panel.jsx's/MapButton.jsx's own ${id}-... ids for the same convention) so these
// stay unique when more than one map instance is on the same page.
const toTabId = (idPrefix, name) => `${idPrefix}-tabs-tab-${name.toLowerCase().replaceAll(/\s+/g, '-')}`
const toPanelId = (idPrefix, name) => `${idPrefix}-tabs-panel-${name.toLowerCase().replaceAll(/\s+/g, '-')}`

/**
 * @param {object} [panelProps] Extra props merged onto the tabpanel div (not the tablist) —
 * e.g. a scrollable container's ref/className/tabIndex, for a caller (Panel.jsx) that needs
 * that behaviour scoped to just the active tab's content, not the tablist above it. `id`,
 * `role` and `aria-labelledby` are structural to the tabs pattern and always win over any
 * same-named key in `panelProps`; `tabIndex` defers to `panelProps.tabIndex` when provided,
 * since a scrollable tabpanel legitimately wants tabIndex 0 rather than the -1 default.
 */
// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const Tabs = ({ tabs, defaultTab, panelProps }) => { // NOSONAR: project does not use PropTypes
  const { id: idPrefix } = useConfig()
  const names = tabs.map(t => t.name)
  const [activeTab, setActiveTab] = useState(defaultTab ?? names[0])

  const activateTab = useCallback((name) => {
    setActiveTab(name)
    document.getElementById(toTabId(idPrefix, name))?.focus()
  }, [idPrefix])

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

  const panelClassName = ['im-c-tabs__panel', panelProps?.className].filter(Boolean).join(' ')

  return (
    <div className='im-c-tabs'>
      <div role='tablist' className='im-c-tabs__list'>
        {tabs.map(({ name }) => (
          <button
            type='button'
            key={name}
            id={toTabId(idPrefix, name)}
            role='tab'
            aria-selected={activeTab === name}
            aria-controls={toPanelId(idPrefix, name)}
            tabIndex={activeTab === name ? 0 : -1}
            className='im-c-tabs__tab'
            onClick={() => activateTab(name)}
            onKeyDown={handleKeyDown}
          >
            <span className='im-c-tabs__label'>{name}</span>
          </button>
        ))}
      </div>
      {/* All tabpanels render, hidden unless active — not swapped in/out — so every tab's
          aria-controls always resolves to a real element, rather than only the active one's.
          panelProps (ref/tabIndex — a scrollable container's, from a caller like Panel.jsx)
          can only meaningfully target one DOM node, so it's applied to the active panel only;
          className is shared by all of them so there's nothing to restyle on switch. */}
      {tabs.map(({ name, content }) => {
        const isActive = activeTab === name
        return (
          <div
            key={name}
            ref={isActive ? panelProps?.ref : undefined}
            id={toPanelId(idPrefix, name)}
            role='tabpanel'
            aria-labelledby={toTabId(idPrefix, name)}
            tabIndex={isActive ? (panelProps?.tabIndex ?? -1) : -1} // nosonar — panel has no focusable children by default (-1); a scrollable active one wants 0, via panelProps
            hidden={!isActive}
            className={panelClassName}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
