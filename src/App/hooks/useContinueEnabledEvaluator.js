import { useLayoutEffect, useContext, useRef } from 'react'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'
import { useMap } from '../store/mapContext.js'
import { PluginContext } from '../store/PluginProvider.jsx'

export function useContinueEnabledEvaluator () {
  const backAndContinue = useConfig()?.backAndContinue
  const { dispatch } = useApp()
  const mapState = useMap()
  const pluginContext = useContext(PluginContext)
  const lastIsDisabledRef = useRef(true)

  useLayoutEffect(() => {
    if (typeof backAndContinue?.continueEnabledWhen !== 'function') { return }
    let isEnabled = false
    try {
      isEnabled = backAndContinue.continueEnabledWhen({
        pluginStates: pluginContext?.state ?? {},
        mapState
      })
    } catch (err) {
      console.warn('continueEnabledWhen error:', err)
    }
    const isDisabled = !isEnabled
    if (lastIsDisabledRef.current !== isDisabled) {
      lastIsDisabledRef.current = isDisabled
      dispatch({ type: 'TOGGLE_BUTTON_DISABLED', payload: { id: 'journeyContinue', isDisabled } })
    }
  }, [backAndContinue, pluginContext, mapState, dispatch])
}
