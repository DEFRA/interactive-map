export const removeSafeZone = (view, dispatch) => {
  const { top, right, bottom, left } = view.padding

  // Clone the current view extent so that we can adjust it after removing the safe zone.
  const extent = view.extent.clone()
  const { resolution } = view

  // Grow the extent by the padding (converted from screen px to map units) so that
  // removing the padding doesn't change what was visible in the previous safe area.
  extent.xmin -= left * resolution
  extent.xmax += right * resolution
  extent.ymin -= bottom * resolution
  extent.ymax += top * resolution

  // Now set the view padding to zero
  const safeZoneInset = { top: 0, right: 0, bottom: 0, left: 0 }
  view.padding = safeZoneInset

  // Re-Apply the adjusted extent to the view so that the visible area remains consistent.
  view.extent = extent

  // finally, dispatch the updated safe zone inset to keep the application state in sync.
  dispatch({
    type: 'SET_SAFE_ZONE_INSET',
    payload: {
      safeZoneInset,
      syncMapPadding: false
    }
  })
}
