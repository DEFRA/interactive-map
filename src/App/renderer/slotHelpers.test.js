import { resolveTargetSlot, isModeAllowed, isControlVisible, isConsumerHtml, isPanelSlotEligible, getAllowedModalPanelId, hasOpenModalPanel } from './slotHelpers.js'

jest.mock('./slots.js', () => ({ allowedSlots: { control: ['inset', 'banner', 'actions'], panel: ['header', 'modal', 'left-top'] } }))

describe('resolveTargetSlot', () => {
  it('returns modal for modal panels', () => {
    expect(resolveTargetSlot({ modal: true, slot: 'side' }, 'desktop')).toBe('modal')
  })

  it('replaces drawer with left-top on tablet and desktop', () => {
    expect(resolveTargetSlot({ slot: 'drawer' }, 'tablet')).toBe('left-top')
    expect(resolveTargetSlot({ slot: 'drawer' }, 'desktop')).toBe('left-top')
  })

  it('keeps drawer on mobile', () => {
    expect(resolveTargetSlot({ slot: 'drawer' }, 'mobile')).toBe('drawer')
  })

  it('returns slot as-is otherwise', () => {
    expect(resolveTargetSlot({ slot: 'side' }, 'desktop')).toBe('side')
  })
})

describe('isModeAllowed', () => {
  it('returns true when no mode restrictions', () => {
    expect(isModeAllowed({}, 'view')).toBe(true)
  })

  it('rejects when mode not in includeModes', () => {
    expect(isModeAllowed({ includeModes: ['edit'] }, 'view')).toBe(false)
  })

  it('rejects when mode in excludeModes', () => {
    expect(isModeAllowed({ excludeModes: ['view'] }, 'view')).toBe(false)
  })

  it('allows when mode matches includeModes', () => {
    expect(isModeAllowed({ includeModes: ['view'] }, 'view')).toBe(true)
  })
})

describe('isControlVisible', () => {
  const base = { desktop: { slot: 'inset' } }

  it('returns true for valid control', () => {
    expect(isControlVisible(base, { breakpoint: 'desktop', mode: 'view', isFullscreen: false })).toBe(true)
  })

  it('returns false when breakpoint config missing', () => {
    expect(isControlVisible(base, { breakpoint: 'mobile', mode: 'view', isFullscreen: false })).toBe(false)
  })

  it('returns false when slot not allowed', () => {
    expect(isControlVisible({ desktop: { slot: 'invalid' } }, { breakpoint: 'desktop', mode: 'view', isFullscreen: false })).toBe(false)
  })

  it('returns false when mode not allowed', () => {
    expect(isControlVisible({ ...base, includeModes: ['edit'] }, { breakpoint: 'desktop', mode: 'view', isFullscreen: false })).toBe(false)
  })

  it('returns false when inline:false and not fullscreen', () => {
    expect(isControlVisible({ ...base, inline: false }, { breakpoint: 'desktop', mode: 'view', isFullscreen: false })).toBe(false)
  })

  it('returns true when inline:false and fullscreen', () => {
    expect(isControlVisible({ ...base, inline: false }, { breakpoint: 'desktop', mode: 'view', isFullscreen: true })).toBe(true)
  })

  it('returns true for a control targeting a panel-body slot via the <panelId>-panel convention', () => {
    const panelTargeting = { desktop: { slot: 'map-styles-panel' } }
    expect(isControlVisible(panelTargeting, { breakpoint: 'desktop', mode: 'view', isFullscreen: false })).toBe(true)
  })
})

describe('isConsumerHtml', () => {
  it('returns true for consumer HTML config', () => {
    expect(isConsumerHtml({ html: '<p>Hi</p>' })).toBe(true)
  })

  it('returns false when pluginId present', () => {
    expect(isConsumerHtml({ html: '<p>Hi</p>', pluginId: 'p1' })).toBe(false)
  })

  it('returns false when no html', () => {
    expect(isConsumerHtml({ render: () => {} })).toBe(false)
  })
})

describe('isPanelSlotEligible', () => {
  const base = { includeModes: ['view'] }
  const ctx = { targetSlot: 'header', mode: 'view', isFullscreen: false }

  it('returns true for a panel in an allowed slot', () => {
    expect(isPanelSlotEligible(base, ctx)).toBe(true)
  })

  it('returns false when the target slot is not an allowed panel slot', () => {
    expect(isPanelSlotEligible(base, { ...ctx, targetSlot: 'invalid' })).toBe(false)
  })

  it('allows a target slot next to a button even though it is not a named panel slot', () => {
    expect(isPanelSlotEligible(base, { ...ctx, targetSlot: 'my-button-button' })).toBe(true)
  })

  it('returns false when mode is not allowed', () => {
    expect(isPanelSlotEligible({ includeModes: ['edit'] }, ctx)).toBe(false)
  })

  it('returns false when inline:false and not fullscreen', () => {
    expect(isPanelSlotEligible({ ...base, inline: false }, ctx)).toBe(false)
  })

  it('returns true when inline:false and fullscreen', () => {
    expect(isPanelSlotEligible({ ...base, inline: false }, { ...ctx, isFullscreen: true })).toBe(true)
  })

  it('returns false when a specific requested slot is given and the target slot does not match it', () => {
    expect(isPanelSlotEligible(base, { ...ctx, slot: 'left-top' })).toBe(false)
  })

  it('returns true when a specific requested slot is given and matches the target slot', () => {
    expect(isPanelSlotEligible(base, { ...ctx, slot: 'header' })).toBe(true)
  })

  it('skips the requested-slot check entirely when slot is omitted (HtmlElementHost usage)', () => {
    expect(isPanelSlotEligible(base, { targetSlot: 'header', mode: 'view', isFullscreen: false })).toBe(true)
  })
})

describe('getAllowedModalPanelId', () => {
  const panelConfig = {
    p1: { desktop: { modal: true } },
    p2: { desktop: { modal: true } },
    p3: { desktop: {} }
  }

  it('returns null when no modal panel is open', () => {
    expect(getAllowedModalPanelId({ p3: { props: {} } }, panelConfig, 'desktop')).toBeNull()
  })

  it('returns the only open modal panel', () => {
    expect(getAllowedModalPanelId({ p1: { props: {} } }, panelConfig, 'desktop')).toBe('p1')
  })

  it('returns the most recently opened modal panel when more than one is open', () => {
    expect(getAllowedModalPanelId({ p1: { props: {} }, p2: { props: {} } }, panelConfig, 'desktop')).toBe('p2')
  })

  it('returns null when there are no open panels at all', () => {
    expect(getAllowedModalPanelId({}, panelConfig, 'desktop')).toBeNull()
  })
})

describe('hasOpenModalPanel', () => {
  const panelConfig = { p1: { desktop: { modal: true } }, p2: { desktop: {} } }

  it('returns false when no modal panel is open', () => {
    expect(hasOpenModalPanel({ p2: { props: {} } }, panelConfig, 'desktop')).toBe(false)
  })

  it('returns true when a modal panel is open', () => {
    expect(hasOpenModalPanel({ p1: { props: {} } }, panelConfig, 'desktop')).toBe(true)
  })
})
