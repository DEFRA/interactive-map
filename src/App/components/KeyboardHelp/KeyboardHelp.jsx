// src/components/KeyboardHelp.jsx
import React from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext.js'
import { Tabs } from '../Tabs/Tabs.jsx'
import { groupIntoTabs } from '../../renderer/groupIntoTabs.js'

const DEFAULT_GROUP = 'Navigate'

const ShortcutList = ({ items }) => (
  <dl className='im-c-keyboard-help__list'>
    {items.map((item) => (
      <div key={item.id} className='im-c-keyboard-help__item'>
        <dt className='im-c-keyboard-help__title'>{item.title}</dt>
        <dd className='im-c-keyboard-help__description' dangerouslySetInnerHTML={{ __html: item.command }} />
      </div>
    ))}
  </dl>
)

/**
 * Picks which tab should be active on open: the first tab containing a shortcut whose own
 * context matches exactly, else the first tab containing a global-context shortcut, else
 * just the first tab. Domain-specific to keyboard shortcuts — not part of groupIntoTabs.
 */
const getDefaultTab = (tabs, context) => {
  const exactMatch = tabs.find(tab =>
    tab.items.some(({ shortcut }) => (shortcut.context ?? 'viewport') === context)
  )
  if (exactMatch) {
    return exactMatch.name
  }
  const globalMatch = tabs.find(tab =>
    tab.items.some(({ shortcut }) => shortcut.context === 'global')
  )
  return globalMatch?.name ?? tabs[0].name
}

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const KeyboardHelp = ({ context = 'viewport' }) => { // NOSONAR: project does not use PropTypes
  const appConfig = useConfig()
  const { listboxIsActive, keyboardShortcutRegistry } = useApp()
  const allShortcuts = keyboardShortcutRegistry.getKeyboardShortcuts(appConfig)
  const shortcuts = listboxIsActive
    ? allShortcuts
    : allShortcuts.filter(s => s.context !== 'listbox')

  const tabs = groupIntoTabs({
    items: shortcuts.map(shortcut => ({ id: shortcut.id, order: 0, tab: shortcut.group, shortcut })),
    fallbackLabel: DEFAULT_GROUP
  })

  if (!tabs) {
    return (
      <div className='im-c-keyboard-help'>
        <ShortcutList items={shortcuts} />
      </div>
    )
  }

  const tabProps = tabs.map(tab => ({
    name: tab.name,
    content: <ShortcutList items={tab.items.map(({ shortcut }) => shortcut)} />
  }))

  return (
    <div className='im-c-keyboard-help'>
      <Tabs tabs={tabProps} defaultTab={getDefaultTab(tabs, context)} />
    </div>
  )
}
