import React from 'react'
// Styles are pulled in via ../flood-menu.scss (the plugin's scss entry point,
// statically imported from index.js), not from here.
import { getGeometryShape } from '../utils/getGeometryShape.js'

const items = [{
  id: 'shape',
  label: 'Draw shape',
  svg: `
    <path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/>
    <path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>
  `
}, {
  id: 'square',
  label: 'Draw square',
  svg: '<rect width="18" height="18" x="3" y="3" rx="2"/>'
}, {
  id: 'edit',
  label: 'Edit area',
  svg: `
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
    <path d="m15 5 4 4"/>
  `
}, {
  id: 'delete',
  label: 'Delete area',
  svg: `
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M3 6h18"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  `
}]

// Renders as a control injected into the host panel — this is
// the floodMenu plugin's drawMenu control specifically (other controls will
// be added to the same plugin manifest as more functionality lands). It owns
// the UI and the "is there a feature?" state only. It never calls the draw or
// frame plugins itself; every click just invokes the matching pluginConfig
// callback (onDrawShape/onDrawSquare/onEdit/onDelete) supplied by the host
// app, which is what actually drives those plugins — see FloodMenuInit.jsx
// for how their events feed state back in here.
export const DrawMenu = ({ pluginConfig, pluginState }) => {
  const { heading = 'Draw a boundary', onDrawShape, onDrawSquare, onEdit, onDelete } = pluginConfig
  const { feature, busy, dispatch } = pluginState

  const hasFeature = !!feature
  const shape = hasFeature ? getGeometryShape(feature.geometry) : null

  const disabled = {
    shape: busy || hasFeature,
    square: busy || hasFeature,
    edit: busy || !hasFeature,
    delete: busy || !hasFeature
  }

  // Draw/edit are interactive map sessions that end via the draw-es/frame
  // Done/Cancel buttons — mark busy immediately so the other three buttons
  // disable straight away; FloodMenuInit clears it when that session ends.
  // Delete is instant, so it skips the busy flag.
  const startSession = (fn) => () => {
    dispatch({ type: 'SET_BUSY', payload: true })
    fn?.()
  }

  const handlers = {
    shape: startSession(onDrawShape),
    square: startSession(onDrawSquare),
    edit: startSession(() => onEdit?.(feature, shape)),
    delete: () => onDelete?.(feature)
  }

  const headingId = 'flood-c-draw-menu__heading'

  return (
    <div className='flood-c-draw-menu'>
      <h3 className='im-e-heading-s flood-c-draw-menu__heading' id={headingId}>{heading}</h3>
      <ul className='flood-c-draw-menu__list' aria-labelledby={headingId}>
        {items.map(item => {
          const handleClick = handlers[item.id]
          return (
            <li className='flood-c-draw-menu__item' key={item.id}>
              <button
                type='button'
                className='flood-c-draw-menu__button'
                disabled={disabled[item.id]}
                onClick={handleClick}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                  focusable='false'
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
                <span className='flood-c-draw-menu__button-label'>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
