// Shared panel dialog/modality classification, used by Panel.jsx (to render the panel's
// own role/aria-modal) and MapButton.jsx (to decide a trigger button's aria-haspopup) so
// the two can't drift apart.

// WCAG requires a modal to always be dismissible, so modal:true forces it regardless of config.
export const classifyPanel = (bpConfig) => {
  const isModal = bpConfig.modal === true
  const isAside = bpConfig.slot === 'side' && bpConfig.open && !isModal
  const isDismissible = isModal || bpConfig.dismissible !== false
  const isDialog = !isAside && isDismissible
  return { isModal, isAside, isDismissible, isDialog }
}

export const getPanelRole = ({ isDialog, isDismissible }) => {
  if (isDialog) {
    return 'dialog'
  }
  if (isDismissible) {
    return 'complementary'
  }
  return 'region'
}
