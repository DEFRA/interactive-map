import { getSafeZoneInset } from './getSafeZoneInset'

const MAIN_WIDTH = 900
const MAIN_HEIGHT = 600
const LEFT_LEFT = 10
const LEFT_WIDTH = 40
const LEFT_TOP = 60
const RIGHT_WIDTH = 40
const ACTIONS_TOP = 540
const BOTTOM_TOP = 560
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
const COMBINED_BELOW_W = 180

const BOTTOM_INSET = MAIN_HEIGHT - BOTTOM_TOP + GAP // 48: divider-gap above top of bottom container
const ABOVE_CAP_TOP = 330 // 60+330+8=398 > CAP_HEIGHT ≈ 389.3 → capped
const ABOVE_CAP_BOTTOM = 342 // 48+342+8=398 > CAP_HEIGHT → capped

const PANEL_W_STANDARD = 200
const PANEL_W_WIDE = 250
const PANEL_W_NARROW = 100
const PANEL_W_XLARGE = 600 // 10+600+8=618 > CAP_WIDTH ≈ 589.3 → capped

const leftInset = w => LEFT_LEFT + w + GAP
const rightInset = w => LEFT_LEFT + w + GAP
const topInset = h => BASE_TOP + h + GAP
const bottomInset = h => BOTTOM_INSET + h + GAP

const MAX_RATIO = 3
const CAP_WIDTH = (MAIN_WIDTH - 2 * GAP) * (MAX_RATIO - 1) / MAX_RATIO
const CAP_HEIGHT = (MAIN_HEIGHT - 2 * GAP) * (MAX_RATIO - 1) / MAX_RATIO

// ─── Setup ──────────────────────────────────────────────────────────────────

let mainRef, leftRef, rightRef, actionsRef, bottomRef

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
  bottomRef = { current: { offsetTop: BOTTOM_TOP, offsetHeight: 0 } }
})

const base = () => ({ mainRef, leftRef, rightRef, actionsRef, bottomRef })

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
    expect(getSafeZoneInset({ mainRef, leftRef, rightRef, bottomRef })).toBeUndefined()
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
    expect(getSafeZoneInset({ mainRef, leftRef: noGroupLeft, rightRef: noGroupRight, actionsRef, bottomRef })).toEqual({
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
  it('uses max of actions and bottom for base bottom', () => {
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
// Trigger is WIDTH-based, evaluated independently of the column (height-based) trigger.

describe('getSafeZoneInset — top edge', () => {
  it('does not trigger when top panel is narrow, even if tall', () => {
    expect(getSafeZoneInset({ ...base(), rightTopRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) }).top).toBe(BASE_TOP)
  })
  it('triggers when a top panel is wide enough, capped at (MAX_RATIO-1)/MAX_RATIO of usable height', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_CAP_TOP) })
    expect(result.top).toBe(CAP_HEIGHT)
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
  })
  it('does not trigger when combined width of two top panels is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: panel(COMBINED_BELOW_W, BELOW_THRESHOLD),
      rightTopRef: panel(COMBINED_BELOW_W, BELOW_THRESHOLD)
    }).top).toBe(BASE_TOP)
  })
})

// ─── Bottom edge ─────────────────────────────────────────────────────────────

describe('getSafeZoneInset — bottom edge', () => {
  it('does not trigger when bottom panel is narrow, even if tall', () => {
    expect(getSafeZoneInset({ ...base(), rightBottomRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) }).bottom).toBe(BASE_BOTTOM)
  })
  it('triggers when a bottom panel is wide enough, capped at (MAX_RATIO-1)/MAX_RATIO of usable height', () => {
    const result = getSafeZoneInset({ ...base(), leftBottomRef: panel(ABOVE_W_THRESHOLD, ABOVE_CAP_BOTTOM) })
    expect(result.bottom).toBe(CAP_HEIGHT)
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
  })
  it('triggers when a bottom panel is wide enough, using the taller of the two slots', () => {
    const result = getSafeZoneInset({ ...base(), rightBottomRef: panel(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD) })
    expect(result.bottom).toBe(bottomInset(ABOVE_THRESHOLD))
    expect(result.right).toBe(rightInset(ABOVE_W_THRESHOLD))
  })
  it('does not trigger when combined width of two bottom panels is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftBottomRef: panel(COMBINED_BELOW_W, BELOW_THRESHOLD),
      rightBottomRef: panel(COMBINED_BELOW_W, BELOW_THRESHOLD)
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

// ─── Row/column independence ───────────────────────────────────────────────────
// A panel that is both tall enough and wide enough triggers BOTH its column (left/
// right) and row (top/bottom) insets at once — not an exclusive either/or pick.
// MAX_RATIO (tested above) is what keeps this from consuming the whole viewport.

describe('getSafeZoneInset — row/column independence', () => {
  it('narrow-but-tall panel triggers only its column inset, not the row', () => {
    const result = getSafeZoneInset({ ...base(), rightTopRef: panel(PANEL_W_STANDARD, ABOVE_THRESHOLD) })
    expect(result.right).toBe(rightInset(PANEL_W_STANDARD))
    expect(result.top).toBe(BASE_TOP)
  })
  it('wide-but-short panel triggers only its row inset, not the column', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, BELOW_THRESHOLD) })
    expect(result.top).toBe(topInset(BELOW_THRESHOLD))
    expect(result.left).toBe(BASE_LEFT)
  })
  it('wide-and-tall panel triggers both its column and row insets at once', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: panel(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD) })
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
    expect(result.top).toBe(topInset(ABOVE_THRESHOLD))
  })
  it('two narrow panels in the same column collectively trigger left, independent of row', () => {
    // Each h=COMBINED_ABOVE (120) < hThreshold individually, combined 248 > 236 → left triggers
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: panel(PANEL_W_STANDARD, COMBINED_ABOVE),
      leftBottomRef: panel(PANEL_W_STANDARD, COMBINED_ABOVE)
    })
    expect(result.left).toBe(leftInset(PANEL_W_STANDARD))
    expect(result.top).toBe(BASE_TOP)
    expect(result.bottom).toBe(BASE_BOTTOM)
  })
})
