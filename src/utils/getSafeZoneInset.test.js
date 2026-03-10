import { getSafeZoneInset } from './getSafeZoneInset'

const MAIN_WIDTH = 900
const MAIN_HEIGHT = 600
const LEFT_LEFT = 10
const LEFT_WIDTH = 40
const LEFT_TOP = 60
const RIGHT_WIDTH = 40
const ACTIONS_TOP = 540
const FOOTER_TOP = 560
const EARLY_ACTIONS_TOP = 500
const GAP = 8

// Base insets: main.offsetLeft=0 in tests
const BASE_LEFT = LEFT_LEFT + LEFT_WIDTH + GAP // 58
const BASE_RIGHT = LEFT_LEFT + RIGHT_WIDTH + GAP // 58
const BASE_TOP = LEFT_TOP // 60
const BASE_BOTTOM = (MAIN_HEIGHT - ACTIONS_TOP) + GAP // 68

// Height threshold: availableHeight / RATIO = (600-60-68)/2 = 236
const ABOVE_THRESHOLD = 240
const BELOW_THRESHOLD = 230
const COMBINED_ABOVE = 120 // two × 120 + gap = 248 > 236
const COMBINED_BELOW = 100 // two × 100 + gap = 208 < 236

// Width threshold: availableWidth / RATIO = (900-58-58)/2 = 392
const ABOVE_W_THRESHOLD = 400
const COMBINED_ABOVE_W = 200 // two × 200 = 400 > 392 → triggers combined
const COMBINED_BELOW_W = 180 // two × 180 = 360 < 392 → does not trigger
const PANEL_H_TALL = 150
const PANEL_H_SHORT = 100

const ABOVE_CAP_TOP = 330 // 60+330+8=398 > CAP_HEIGHT ≈ 389.3 → capped
const FOOTER_INSET = MAIN_HEIGHT - FOOTER_TOP + GAP // 48
const ABOVE_CAP_BOTTOM = 342 // 48+342+8=398 > CAP_HEIGHT → capped

const PANEL_W_STANDARD = 200
const PANEL_W_WIDE = 250
const PANEL_W_NARROW = 100
const PANEL_W_XLARGE = 600 // 10+600+8=618 > CAP_WIDTH ≈ 589.3 → capped

const leftInset = w => LEFT_LEFT + w + GAP
const rightInset = w => LEFT_LEFT + w + GAP
const topInset = h => BASE_TOP + h + GAP

const MAX_RATIO = 3
const CAP_WIDTH = (MAIN_WIDTH - 2 * GAP) * (MAX_RATIO - 1) / MAX_RATIO
const CAP_HEIGHT = (MAIN_HEIGHT - 2 * GAP) * (MAX_RATIO - 1) / MAX_RATIO

// ─── Setup ──────────────────────────────────────────────────────────────────

let mainRef, leftRef, rightRef, actionsRef, footerRef

beforeAll(() => {
  globalThis.getComputedStyle = jest.fn().mockReturnValue({ getPropertyValue: () => String(GAP) })
})

const colRef = (offsetWidth, offsetLeft, offsetTop) => {
  const buttonGroup = { offsetWidth }
  return {
    current: {
      offsetWidth,
      offsetLeft,
      offsetTop,
      querySelector: (sel) => sel === '.im-c-button-group' ? buttonGroup : null
    }
  }
}

beforeEach(() => {
  mainRef = { current: { offsetWidth: MAIN_WIDTH, offsetHeight: MAIN_HEIGHT, offsetLeft: 0 } }
  leftRef = colRef(LEFT_WIDTH, LEFT_LEFT, LEFT_TOP)
  rightRef = colRef(RIGHT_WIDTH)
  actionsRef = { current: { offsetTop: ACTIONS_TOP } }
  footerRef = { current: { offsetTop: FOOTER_TOP } }
})

const base = () => ({ mainRef, leftRef, rightRef, actionsRef, footerRef })

// Slot container where an .im-c-panel is the first element child.
const panel = (offsetWidth, offsetHeight) => {
  const panelEl = { offsetWidth, offsetHeight, classList: { contains: (c) => c === 'im-c-panel' } }
  return { current: { firstElementChild: panelEl } }
}

// Slot container where a button precedes the panel (panel should be ignored).
const panelAfterButton = () => ({ current: { firstElementChild: { classList: { contains: () => false } } } })

// ─── Missing refs ────────────────────────────────────────────────────────────

describe('getSafeZoneInset — missing refs', () => {
  it('returns undefined when mainRef.current is null', () => {
    expect(getSafeZoneInset({ ...base(), mainRef: { current: null } })).toBeUndefined()
  })
  it('returns undefined when leftRef.current is null', () => {
    expect(getSafeZoneInset({ ...base(), leftRef: { current: null } })).toBeUndefined()
  })
  it('returns undefined when actionsRef is undefined', () => {
    expect(getSafeZoneInset({ mainRef, leftRef, rightRef, footerRef })).toBeUndefined()
  })
})

// ─── Base structural insets ──────────────────────────────────────────────────

describe('getSafeZoneInset — base structural insets', () => {
  it('returns base insets when no panel refs are provided', () => {
    expect(getSafeZoneInset(base())).toEqual({
      left: BASE_LEFT, right: BASE_RIGHT, top: BASE_TOP, bottom: BASE_BOTTOM
    })
  })
  it('ignores a panel that is not the first element in its slot (buttons precede it)', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panelAfterButton() }).left).toBe(BASE_LEFT)
  })
  it('ignores a slot container with no children', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: { current: { firstElementChild: null } } }).left).toBe(BASE_LEFT)
  })
  it('ignores a panel with zero width', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panel(0, ABOVE_THRESHOLD) }).left).toBe(BASE_LEFT)
  })
  it('uses zero button width when column ref has no button group', () => {
    const noGroupLeft = { current: { offsetWidth: 0, offsetLeft: LEFT_LEFT, offsetTop: LEFT_TOP, querySelector: () => null } }
    const noGroupRight = { current: { offsetWidth: 0, offsetLeft: 0, offsetTop: 0, querySelector: () => null } }
    expect(getSafeZoneInset({ mainRef, leftRef: noGroupLeft, rightRef: noGroupRight, actionsRef, footerRef })).toEqual({
      left: LEFT_LEFT + GAP, right: LEFT_LEFT + GAP, top: LEFT_TOP, bottom: BASE_BOTTOM
    })
  })
  it('returns base insets when all panel slots are empty (height 0)', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(PANEL_W_STANDARD, 0),
      leftBottomRef: panel(PANEL_W_STANDARD, 0),
      rightTopRef: panel(PANEL_W_STANDARD, 0),
      rightBottomRef: panel(PANEL_W_STANDARD, 0)
    })).toEqual({ left: BASE_LEFT, right: BASE_RIGHT, top: BASE_TOP, bottom: BASE_BOTTOM })
  })
  it('uses max of actions and footer for base bottom', () => {
    actionsRef.current.offsetTop = EARLY_ACTIONS_TOP
    expect(getSafeZoneInset(base()).bottom).toBe(MAIN_HEIGHT - EARLY_ACTIONS_TOP + GAP)
  })
})

// ─── Left edge ───────────────────────────────────────────────────────────────

describe('getSafeZoneInset — left edge', () => {
  it('does not trigger when single panel height is below threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panel(PANEL_W_STANDARD, BELOW_THRESHOLD) }).left).toBe(BASE_LEFT)
  })
  it('triggers when single panel height exceeds threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) }).left)
      .toBe(leftInset(PANEL_W_STANDARD))
  })
  it('triggers when combined height of two panels exceeds threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(PANEL_W_STANDARD, COMBINED_ABOVE),
      leftBottomRef: panel(PANEL_W_NARROW, COMBINED_ABOVE)
    }).left).toBe(leftInset(PANEL_W_STANDARD))
  })
  it('does not trigger when combined height is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(PANEL_W_STANDARD, COMBINED_BELOW),
      leftBottomRef: panel(PANEL_W_STANDARD, COMBINED_BELOW)
    }).left).toBe(BASE_LEFT)
  })
  it('uses the wider panel for the inset amount', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(PANEL_W_WIDE, COMBINED_ABOVE),
      leftBottomRef: panel(PANEL_W_NARROW, COMBINED_ABOVE)
    }).left).toBe(leftInset(PANEL_W_WIDE))
  })
})

// ─── Right edge ──────────────────────────────────────────────────────────────

describe('getSafeZoneInset — right edge', () => {
  it('triggers when combined height of right-column panels exceeds threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      rightTopRef: panel(PANEL_W_STANDARD, COMBINED_ABOVE),
      rightBottomRef: panel(PANEL_W_NARROW, COMBINED_ABOVE)
    }).right).toBe(rightInset(PANEL_W_STANDARD))
  })
  it('does not trigger when combined height is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      rightTopRef: panel(PANEL_W_STANDARD, COMBINED_BELOW),
      rightBottomRef: panel(PANEL_W_STANDARD, COMBINED_BELOW)
    }).right).toBe(BASE_RIGHT)
  })
})

// ─── Top edge ────────────────────────────────────────────────────────────────
// Trigger is WIDTH-based. A narrow panel must not add top padding even if tall.

describe('getSafeZoneInset — top edge', () => {
  it('does not trigger when top panel is narrow, even if tall', () => {
    // PANEL_W_STANDARD (200) < width threshold (392)
    expect(getSafeZoneInset({ ...base(), rightTopRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) }).top).toBe(BASE_TOP)
  })
  it('triggers when a top panel width exceeds threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD) }).top)
      .toBe(topInset(ABOVE_THRESHOLD))
  })
  it('column-primary wide-and-tall top panel triggers left inset, not top', () => {
    // panel(400,330): h/availableH≈0.699 > w/availableW≈0.510 → column-primary
    const result = getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_CAP_TOP) })
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
    expect(result.top).toBe(BASE_TOP)
  })
  it('when top panels have mixed primaries, each contributes to its own edge', () => {
    // tl(400,100): row-primary → top; tr(400,330): column-primary → right
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: panel(ABOVE_W_THRESHOLD, COMBINED_BELOW),
      rightTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_CAP_TOP)
    })
    expect(result.top).toBe(topInset(COMBINED_BELOW))
    expect(result.right).toBe(rightInset(ABOVE_W_THRESHOLD))
  })
  it('triggers when combined width of two top panels exceeds threshold; uses max height', () => {
    // each COMBINED_ABOVE_W (200) < threshold (392), but 200+200=400 > 392
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(COMBINED_ABOVE_W, PANEL_H_TALL),
      rightTopRef: panel(COMBINED_ABOVE_W, PANEL_H_SHORT)
    }).top).toBe(topInset(PANEL_H_TALL))
  })
  it('does not trigger when both top panels are below combined width threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(COMBINED_BELOW_W, ABOVE_THRESHOLD),
      rightTopRef: panel(COMBINED_BELOW_W, ABOVE_THRESHOLD)
    }).top).toBe(BASE_TOP)
  })
})

// ─── Bottom edge ─────────────────────────────────────────────────────────────

describe('getSafeZoneInset — bottom edge', () => {
  it('does not trigger when bottom panel is narrow, even if tall', () => {
    expect(getSafeZoneInset({ ...base(), rightBottomRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) }).bottom).toBe(BASE_BOTTOM)
  })
  it('triggers when a bottom panel width exceeds threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftBottomRef: panel(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD) }).bottom)
      .toBe(Math.min(FOOTER_INSET + ABOVE_THRESHOLD + GAP, CAP_HEIGHT))
  })
  it('column-primary wide-and-tall bottom panel triggers left inset, not bottom', () => {
    // panel(400,342): h/availableH≈0.724 > w/availableW≈0.510 → column-primary
    const result = getSafeZoneInset({ ...base(), leftBottomRef: panel(ABOVE_W_THRESHOLD, ABOVE_CAP_BOTTOM) })
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
    expect(result.bottom).toBe(BASE_BOTTOM)
  })
  it('triggers when combined width of two bottom panels exceeds threshold; uses max height', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftBottomRef: panel(COMBINED_ABOVE_W, PANEL_H_TALL),
      rightBottomRef: panel(COMBINED_ABOVE_W, PANEL_H_SHORT)
    }).bottom).toBe(Math.min(FOOTER_INSET + PANEL_H_TALL + GAP, CAP_HEIGHT))
  })
  it('does not trigger when both bottom panels are below combined width threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftBottomRef: panel(COMBINED_BELOW_W, ABOVE_THRESHOLD),
      rightBottomRef: panel(COMBINED_BELOW_W, ABOVE_THRESHOLD)
    }).bottom).toBe(BASE_BOTTOM)
  })
})

// ─── MAX_RATIO cap ────────────────────────────────────────────────────────────

describe('getSafeZoneInset — MAX_RATIO cap', () => {
  it('caps left inset at (MAX_RATIO-1)/MAX_RATIO of usable width', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: panel(PANEL_W_XLARGE, PANEL_W_XLARGE) }).left).toBe(CAP_WIDTH)
  })
  it('caps right inset at (MAX_RATIO-1)/MAX_RATIO of usable width', () => {
    expect(getSafeZoneInset({ ...base(), rightTopRef: panel(PANEL_W_XLARGE, PANEL_W_XLARGE) }).right).toBe(CAP_WIDTH)
  })
})

// ─── Corner panel independence ────────────────────────────────────────────────

describe('getSafeZoneInset — corner panel independence', () => {
  it('narrow-but-tall corner panel triggers side inset only (not top)', () => {
    // PANEL_W_STANDARD (200): tall enough for right, too narrow for top (< 392)
    const result = getSafeZoneInset({ ...base(), rightTopRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) })
    expect(result.right).toBe(rightInset(PANEL_W_STANDARD))
    expect(result.top).toBe(BASE_TOP)
  })
  it('wide-and-tall corner panel triggers only its primary (row) edge inset', () => {
    // panel(400, 240): w/availableW≈0.510, h/availableH≈0.508 → row-primary → top only
    const result = getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD) })
    expect(result.left).toBe(BASE_LEFT)
    expect(result.top).toBe(topInset(ABOVE_THRESHOLD))
  })
  it('two wide panels in the same column collectively trigger left but not top or bottom', () => {
    // Each h=COMBINED_ABOVE (120) < hThreshold individually, combined 248 > 236
    // Each w=ABOVE_W_THRESHOLD (400) > wThreshold → left column triggers, excluding from top/bottom
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: panel(ABOVE_W_THRESHOLD, COMBINED_ABOVE),
      leftBottomRef: panel(ABOVE_W_THRESHOLD, COMBINED_ABOVE)
    })
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
    expect(result.top).toBe(BASE_TOP)
    expect(result.bottom).toBe(BASE_BOTTOM)
  })
})
