import { useState, useRef } from 'react'
import CodeBlock from '@theme/CodeBlock'

function dedent (str) {
  const lines = str.split('\n')
  if (lines[0].trim() === '') {
    lines.shift()
  }
  if (lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  const indent = lines
    .filter(line => line.trim())
    .reduce((min, line) => Math.min(min, line.match(/^\s*/)[0].length), Infinity)
  return lines.map(line => line.slice(indent)).join('\n')
}

export default function CodeTabs ({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef([])

  const activate = (index) => {
    setActiveIndex(index)
    tabRefs.current[index]?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      activate((activeIndex + 1) % tabs.length)
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      activate((activeIndex - 1 + tabs.length) % tabs.length)
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      activate(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      activate(tabs.length - 1)
    }
  }

  return (
    <div className='govuk-tabs'>
      <ul className='govuk-tabs__list' role='tablist' onKeyDown={onKeyDown}>
        {tabs.map((tab, i) => {
          const id = `codetab-${tab.label.toLowerCase()}`
          return (
            <li
              key={tab.label}
              className={`govuk-tabs__list-item${i === activeIndex ? ' govuk-tabs__list-item--selected' : ''}`}
            >
              <a
                ref={(el) => { tabRefs.current[i] = el }}
                className='govuk-tabs__tab'
                href={`#${id}`}
                role='tab'
                aria-selected={i === activeIndex}
                aria-controls={`${id}-panel`}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={(e) => { e.preventDefault(); setActiveIndex(i) }}
              >
                {tab.label}
              </a>
            </li>
          )
        })}
      </ul>
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex
        return (
          <div
            key={tab.label}
            id={`codetab-${tab.label.toLowerCase()}-panel`}
            className={`govuk-tabs__panel${isActive ? '' : ' govuk-tabs__panel--hidden'}`}
            role='tabpanel'
            aria-labelledby={`codetab-${tab.label.toLowerCase()}`}
            hidden={!isActive}
          >
            <CodeBlock className={`language-${tab.language ?? 'js'}`}>
              {dedent(tab.code)}
            </CodeBlock>
          </div>
        )
      })}
    </div>
  )
}
