export function getInitialOpenPanels (panelConfig, breakpoint, prevOpenPanels = {}) {
  const openPanels = {}

  Object.keys(panelConfig).forEach((panelId) => {
    const configPanel = panelConfig[panelId]
    const bpConfig = configPanel[breakpoint]

    const isOpen = bpConfig?.open ?? false

    if (isOpen) {
      // Preserve any props that were already set in state
      openPanels[panelId] = prevOpenPanels[panelId] || { props: {} }
    }
  })

  return openPanels
}
