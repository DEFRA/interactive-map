import { resolveTargetSlot, isModeAllowed, isControlVisible, isConsumerHtml } from './slotHelpers.js'

jest.mock('./slots.js', () => ({ allowedSlots: { control: ['inset', 'banner', 'actions'] } }))

describe('resolveTargetSlot', () => {
  it('returns modal for modal panels', () => {
    expect(resolveTargetSlot({ modal: true, slot: 'side' }, 'desktop')).toBe('modal')
  })

  it('replaces bottom with inset on tablet and desktop', () => {
    expect(resolveTargetSlot({ slot: 'bottom' }, 'tablet')).toBe('inset')
    expect(resolveTargetSlot({ slot: 'bottom' }, 'desktop')).toBe('inset')
  })

  it('keeps bottom on mobile', () => {
    expect(resolveTargetSlot({ slot: 'bottom' }, 'mobile')).toBe('bottom')
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
