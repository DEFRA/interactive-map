// src/core/hooks/useButtonStateEvaluator.js
import { useLayoutEffect, useContext } from 'react'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'
import { PluginContext } from '../store/PluginProvider.jsx'

function evaluateButtonState ({ btn, pluginId, appState, dispatch, evaluateProp }) {
  const checks = [{
    prop: 'enableWhen',
    state: appState.disabledButtons,
    action: 'TOGGLE_BUTTON_DISABLED',
    invert: true,
    key: 'isDisabled'
  },
  {
    prop: 'hiddenWhen',
    state: appState.hiddenButtons,
    action: 'TOGGLE_BUTTON_HIDDEN',
    key: 'isHidden'
  },
  {
    prop: 'pressedWhen',
    state: appState.pressedButtons,
    action: 'TOGGLE_BUTTON_PRESSED',
    key: 'isPressed'
  },
  {
    prop: 'expandedWhen',
    state: appState.expandedButtons,
    action: 'TOGGLE_BUTTON_EXPANDED',
    key: 'isExpanded'
  }]

  checks.forEach(({ prop, state, action, key, invert }) => {
    if (typeof btn[prop] !== 'function') {
      return
    }

    try {
      const result = evaluateProp(btn[prop], pluginId)
      const next = invert ? !result : result
      const current = state.has(btn.id)

      if (current !== next) {
        dispatch({ type: action, payload: { id: btn.id, [key]: next } })
      }
    } catch (err) {
      console.warn(`${prop} error for button ${btn.id}:`, err)
    }
  })
}

export function useButtonStateEvaluator (evaluateProp) {
  const appState = useApp()
  const { pluginRegistry } = useConfig()
  const pluginContext = useContext(PluginContext)

  useLayoutEffect(() => {
    if (!appState?.dispatch || !pluginContext) {
      return
    }

    const { dispatch } = appState

    pluginRegistry.registeredPlugins.forEach(plugin => {
      const buttons = (plugin?.manifest?.buttons ?? []).flatMap(b => [b, ...(b.menuItems ?? [])])

      buttons.forEach(btn =>
        evaluateButtonState({
          btn,
          pluginId: plugin.id,
          appState,
          dispatch,
          evaluateProp
        })
      )
    })
  }, [appState, pluginContext, evaluateProp])
}
