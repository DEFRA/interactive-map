export const removeSafeZone = (view, dispatch) => {
  const safeZoneInset = { top: 0, right: 0, bottom: 0, left: 0 }
  view.padding = safeZoneInset
  dispatch({
    type: 'SET_SAFE_ZONE_INSET',
    payload: {
      safeZoneInset,
      syncMapPadding: false
    }
  })
}
