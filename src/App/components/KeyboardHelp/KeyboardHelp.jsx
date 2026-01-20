// src/components/KeyboardHelp.jsx
import React from 'react'
import { getKeyboardShortcuts } from '../../registry/keyboardShortcutRegistry.js'

export const KeyboardHelp = () => {
  const groups = getKeyboardShortcuts().reduce((acc, shortcut) => {
    acc[shortcut.group] = acc[shortcut.group] || []
    acc[shortcut.group].push(shortcut)
    return acc
  }, {})

  return (
    <div className='im-c-keyboard-help'>
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} className='im-c-keyboard-help__group'>
          {/* <h3 className='im-c-keyboard-help__title'>{groupName}</h3> */}
          <dl className='im-c-keyboard-help__list'>
            {items.map((item) => (
              <div key={item.id} className='im-c-keyboard-help__item'>
                <dt className='im-c-keyboard-help__title'>{item.title}</dt>
                <dd className='im-c-keyboard-help__description' dangerouslySetInnerHTML={{ __html: item.command }} />
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
