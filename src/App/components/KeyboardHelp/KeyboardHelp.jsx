// src/components/KeyboardHelp.jsx
import React from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext.js'
import { getKeyboardShortcuts } from '../../registry/keyboardShortcutRegistry.js'
import { Tabs } from '../Tabs/Tabs.jsx'

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

const buildGroupMap = (shortcuts) => shortcuts.reduce((acc, shortcut) => {
  const group = shortcut.group || 'Navigate'
  if (!acc[group]) {
    acc[group] = []
  }
  acc[group].push(shortcut)
  return acc
}, {})

const getDefaultTab = (groupEntries, context) => {
  if (!groupEntries.length) {
    return undefined
  }
  const exactMatch = groupEntries.find(([, items]) =>
    items.some(s => (s.context ?? 'viewport') === context)
  )
  if (exactMatch) {
    return exactMatch[0]
  }
  const globalMatch = groupEntries.find(([, items]) =>
    items.some(s => s.context === 'global')
  )
  return globalMatch?.[0] ?? groupEntries[0][0]
}

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const KeyboardHelp = ({ context = 'viewport' }) => { // NOSONAR: project does not use PropTypes
  const appConfig = useConfig()
  const { listboxIsActive } = useApp()
  const allShortcuts = getKeyboardShortcuts(appConfig)
  const shortcuts = listboxIsActive
    ? allShortcuts
    : allShortcuts.filter(s => !s.group && s.context !== 'listbox')
  const groupMap = buildGroupMap(shortcuts)
  const groupEntries = Object.entries(groupMap)

  if (groupEntries.length <= 1) {
    return (
      <div className='im-c-keyboard-help'>
        <ShortcutList items={shortcuts} />
      </div>
    )
  }

  const tabs = groupEntries.map(([name, items]) => ({
    name,
    content: <ShortcutList items={items} />
  }))

  return (
    <div className='im-c-keyboard-help'>
      <Tabs tabs={tabs} defaultTab={getDefaultTab(groupEntries, context)} />
    </div>
  )
}
