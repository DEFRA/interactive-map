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
  mainRef = {
    current: {
      offsetWidth: MAIN_WIDTH,
      offsetHeight: MAIN_HEIGHT,
      offsetLeft: 0,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: MAIN_WIDTH, bottom: MAIN_HEIGHT, width: MAIN_WIDTH, height: MAIN_HEIGHT })
    }
  }
  leftRef = colRef(LEFT_WIDTH, LEFT_LEFT, LEFT_TOP)
  rightRef = colRef(RIGHT_WIDTH)
  actionsRef = { current: { offsetTop: ACTIONS_TOP } }
  bottomRef = { current: { offsetTop: BOTTOM_TOP, offsetHeight: 0 } }
})

const base = () => ({ mainRef, leftRef, rightRef, actionsRef, bottomRef })

// Bottom slots end just above the footer
const BOTTOM_EDGE = MAIN_HEIGHT - BOTTOM_INSET

// An element in a slot, positioned by the slot helpers below
const item = (width, height, { hidden = false, isPanel = true } = {}) => ({ width, height, hidden, isPanel })
const buttons = () => item(40, 40, { isPanel: false })

const toElement = ({ width, height, hidden, isPanel }, left, top) => ({
  hidden,
  classList: { contains: (className) => isPanel && className === 'im-c-panel' },
  getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height, width, height })
})

// Lays a slot's elements out as the page does: in the left or right column, top slots stacking
// down from the top of the column and bottom slots stacking up from above the footer. Hidden
// elements take no space.
const layOutSlot = (items, { side, end }) => {
  const leftOf = ({ width }) => side === 'left' ? LEFT_LEFT : MAIN_WIDTH - LEFT_LEFT - width
  const placed = []
  let cursor = end === 'top' ? LEFT_TOP : BOTTOM_EDGE
  const ordered = end === 'top' ? items : [...items].reverse()
  ordered.forEach(slotItem => {
    const top = end === 'top' ? cursor : cursor - slotItem.height
    placed.push(toElement(slotItem, leftOf(slotItem), top))
    if (!slotItem.hidden) {
      cursor = end === 'top' ? cursor + slotItem.height + GAP : top - GAP
    }
  })
  return { current: { children: end === 'top' ? placed : placed.reverse() } }
}

const leftTop = (...items) => layOutSlot(items, { side: 'left', end: 'top' })
const leftBottom = (...items) => layOutSlot(items, { side: 'left', end: 'bottom' })
const rightTop = (...items) => layOutSlot(items, { side: 'right', end: 'top' })
const rightBottom = (...items) => layOutSlot(items, { side: 'right', end: 'bottom' })

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
  it('counts a panel below buttons in its slot', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(buttons(), item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) }).left)
      .toBe(leftInset(PANEL_W_STANDARD))
  })
  it('ignores a slot container with no children', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop() }).left).toBe(BASE_LEFT)
  })
  it('ignores a panel with zero width', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(0, ABOVE_THRESHOLD)) }).left).toBe(BASE_LEFT)
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
      leftTopRef: leftTop(item(PANEL_W_STANDARD, 0)),
      leftBottomRef: leftBottom(item(PANEL_W_STANDARD, 0)),
      rightTopRef: rightTop(item(PANEL_W_STANDARD, 0)),
      rightBottomRef: rightBottom(item(PANEL_W_STANDARD, 0))
    })).toEqual({ left: BASE_LEFT, right: BASE_RIGHT, top: BASE_TOP, bottom: BASE_BOTTOM })
  })
  it('uses max of actions and bottom for base bottom', () => {
    actionsRef.current.offsetTop = EARLY_ACTIONS_TOP
    expect(getSafeZoneInset(base()).bottom).toBe(MAIN_HEIGHT - EARLY_ACTIONS_TOP + GAP)
  })
})

// ─── Bottom row ──────────────────────────────────────────────────────────────

describe('getSafeZoneInset — bottom row', () => {
  const TOP_ROW_HEIGHT = 100
  const noActions = { current: { offsetTop: MAIN_HEIGHT } }
  // A bottom row made tall by its contents, such as the scale bar and map controls
  const tallRow = { current: { offsetTop: 300, offsetHeight: MAIN_HEIGHT - 300 - GAP } }

  // A top row column, with a child that shows or one that's hidden
  const shownChild = { hidden: false, getClientRects: () => [{}], getBoundingClientRect: () => ({}) }
  const hiddenChild = { hidden: true }
  const topCol = (offsetHeight, children = [shownChild]) => ({ offsetHeight, children })
  const topRow = (...cols) => ({ current: { children: cols } })

  it('mirrors the top row and its margin, ignoring the bottom row', () => {
    expect(getSafeZoneInset({ ...base(), actionsRef: noActions, bottomRef: tallRow, topRef: topRow(topCol(TOP_ROW_HEIGHT), topCol(40)) }).bottom)
      .toBe(GAP + TOP_ROW_HEIGHT)
  })
  it('ignores a top row column whose items are all hidden', () => {
    expect(getSafeZoneInset({ ...base(), actionsRef: noActions, bottomRef: tallRow, topRef: topRow(topCol(TOP_ROW_HEIGHT, [hiddenChild]), topCol(40)) }).bottom)
      .toBe(GAP + 40)
  })
  it('collapses to the margin when there is no top row', () => {
    expect(getSafeZoneInset({ ...base(), actionsRef: noActions, bottomRef: tallRow, topRef: topRow() }).bottom)
      .toBe(GAP)
  })
  it('clears anything below the bottom row, such as the drawer', () => {
    const rowBottom = 400
    expect(getSafeZoneInset({ ...base(), actionsRef: noActions, bottomRef: { current: { offsetTop: rowBottom, offsetHeight: 0 } } }).bottom)
      .toBe(MAIN_HEIGHT - rowBottom)
  })
})

// ─── Left edge ───────────────────────────────────────────────────────────────

describe('getSafeZoneInset — left edge', () => {
  it('does not trigger when single panel height is below threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_STANDARD, BELOW_THRESHOLD)) }).left).toBe(BASE_LEFT)
  })
  it('triggers when single panel height exceeds threshold', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) }).left)
      .toBe(leftInset(PANEL_W_STANDARD))
  })
  it('triggers when combined height of two panels exceeds threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_STANDARD, COMBINED_ABOVE)),
      leftBottomRef: leftBottom(item(PANEL_W_NARROW, COMBINED_ABOVE))
    }).left).toBe(leftInset(PANEL_W_STANDARD))
  })
  it('does not trigger when combined height is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_STANDARD, COMBINED_BELOW)),
      leftBottomRef: leftBottom(item(PANEL_W_STANDARD, COMBINED_BELOW))
    }).left).toBe(BASE_LEFT)
  })
  it('uses the wider panel for the inset amount', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_WIDE, COMBINED_ABOVE)),
      leftBottomRef: leftBottom(item(PANEL_W_NARROW, COMBINED_ABOVE))
    }).left).toBe(leftInset(PANEL_W_WIDE))
  })
})

// ─── Right edge ──────────────────────────────────────────────────────────────

describe('getSafeZoneInset — right edge', () => {
  it('triggers when combined height of right-column panels exceeds threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      rightTopRef: rightTop(item(PANEL_W_STANDARD, COMBINED_ABOVE)),
      rightBottomRef: rightBottom(item(PANEL_W_NARROW, COMBINED_ABOVE))
    }).right).toBe(rightInset(PANEL_W_STANDARD))
  })
  it('does not trigger when combined height is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      rightTopRef: rightTop(item(PANEL_W_STANDARD, COMBINED_BELOW)),
      rightBottomRef: rightBottom(item(PANEL_W_STANDARD, COMBINED_BELOW))
    }).right).toBe(BASE_RIGHT)
  })
})

// ─── Top edge ────────────────────────────────────────────────────────────────
// Trigger is WIDTH-based, evaluated independently of the column (height-based) trigger.

describe('getSafeZoneInset — top edge', () => {
  it('does not trigger when top panel is narrow, even if tall', () => {
    expect(getSafeZoneInset({ ...base(), rightTopRef: rightTop(item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) }).top).toBe(BASE_TOP)
  })
  it('triggers when a top panel is wide enough but too short to clear its side', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(ABOVE_W_THRESHOLD, BELOW_THRESHOLD)) }).top)
      .toBe(topInset(BELOW_THRESHOLD))
  })
  it('triggers when a top panel is wider than its side\'s capped inset can clear, capped at (MAX_RATIO-1)/MAX_RATIO of usable height', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_XLARGE, ABOVE_CAP_TOP)) })
    expect(result.left).toBe(CAP_WIDTH)
    expect(result.top).toBe(CAP_HEIGHT)
  })
  it('does not trigger when combined width of two top panels is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(COMBINED_BELOW_W, BELOW_THRESHOLD)),
      rightTopRef: rightTop(item(COMBINED_BELOW_W, BELOW_THRESHOLD))
    }).top).toBe(BASE_TOP)
  })
})

// ─── Bottom edge ─────────────────────────────────────────────────────────────

describe('getSafeZoneInset — bottom edge', () => {
  it('does not trigger when bottom panel is narrow, even if tall', () => {
    expect(getSafeZoneInset({ ...base(), rightBottomRef: rightBottom(item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) }).bottom).toBe(BASE_BOTTOM)
  })
  it('triggers when a bottom panel is wide enough but too short to clear its side', () => {
    const result = getSafeZoneInset({ ...base(), rightBottomRef: rightBottom(item(ABOVE_W_THRESHOLD, BELOW_THRESHOLD)) })
    expect(result.bottom).toBe(bottomInset(BELOW_THRESHOLD))
    expect(result.right).toBe(BASE_RIGHT)
  })
  it('triggers when a bottom panel is wider than its side\'s capped inset can clear, capped at (MAX_RATIO-1)/MAX_RATIO of usable height', () => {
    const result = getSafeZoneInset({ ...base(), leftBottomRef: leftBottom(item(PANEL_W_XLARGE, ABOVE_CAP_BOTTOM)) })
    expect(result.left).toBe(CAP_WIDTH)
    expect(result.bottom).toBe(CAP_HEIGHT)
  })
  it('does not trigger when combined width of two bottom panels is below threshold', () => {
    expect(getSafeZoneInset({
      ...base(),
      leftBottomRef: leftBottom(item(COMBINED_BELOW_W, BELOW_THRESHOLD)),
      rightBottomRef: rightBottom(item(COMBINED_BELOW_W, BELOW_THRESHOLD))
    }).bottom).toBe(BASE_BOTTOM)
  })
})

// ─── MAX_RATIO cap ────────────────────────────────────────────────────────────

describe('getSafeZoneInset — MAX_RATIO cap', () => {
  it('caps left inset at (MAX_RATIO-1)/MAX_RATIO of usable width', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_XLARGE, PANEL_W_XLARGE)) }).left).toBe(CAP_WIDTH)
  })
  it('caps right inset at (MAX_RATIO-1)/MAX_RATIO of usable width', () => {
    expect(getSafeZoneInset({ ...base(), rightTopRef: rightTop(item(PANEL_W_XLARGE, PANEL_W_XLARGE)) }).right).toBe(CAP_WIDTH)
  })
})

// ─── Row/column independence ───────────────────────────────────────────────────
// A panel that is both tall enough and wide enough triggers BOTH its column (left/
// right) and row (top/bottom) insets at once — not an exclusive either/or pick.
// MAX_RATIO (tested above) is what keeps this from consuming the whole viewport.

describe('getSafeZoneInset — row/column independence', () => {
  it('narrow-but-tall panel triggers only its column inset, not the row', () => {
    const result = getSafeZoneInset({ ...base(), rightTopRef: rightTop(item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) })
    expect(result.right).toBe(rightInset(PANEL_W_STANDARD))
    expect(result.top).toBe(BASE_TOP)
  })
  it('wide-but-short panel triggers only its row inset, not the column', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(ABOVE_W_THRESHOLD, BELOW_THRESHOLD)) })
    expect(result.top).toBe(topInset(BELOW_THRESHOLD))
    expect(result.left).toBe(BASE_LEFT)
  })
  it('a wide-and-tall panel its side inset clears doesn\'t also push the top', () => {
    const result = getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(ABOVE_W_THRESHOLD, ABOVE_THRESHOLD)) })
    expect(result.left).toBe(leftInset(ABOVE_W_THRESHOLD))
    expect(result.top).toBe(BASE_TOP)
  })
  it('only panels on a side that isn\'t cleared count towards the top', () => {
    // Left: two panels stacked, tall enough to clear the left. Right: one short panel. Together
    // they'd be wide enough, but the right one alone isn't
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_WIDE, COMBINED_BELOW), item(PANEL_W_WIDE, ABOVE_THRESHOLD)),
      rightTopRef: rightTop(item(PANEL_W_WIDE, COMBINED_BELOW))
    })
    expect(result.left).toBe(leftInset(PANEL_W_WIDE))
    expect(result.top).toBe(BASE_TOP)
  })
  it('two narrow panels in the same column collectively trigger left, independent of row', () => {
    // Each h=COMBINED_ABOVE (120) < hThreshold individually, combined 248 > 236 → left triggers
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_STANDARD, COMBINED_ABOVE)),
      leftBottomRef: leftBottom(item(PANEL_W_STANDARD, COMBINED_ABOVE))
    })
    expect(result.left).toBe(leftInset(PANEL_W_STANDARD))
    expect(result.top).toBe(BASE_TOP)
    expect(result.bottom).toBe(BASE_BOTTOM)
  })
})

// ─── Every open panel in a slot ───────────────────────────────────────────────

describe('getSafeZoneInset — every open panel in a slot', () => {
  it('counts an open panel after a closed one', () => {
    const closed = item(PANEL_W_WIDE, ABOVE_THRESHOLD, { hidden: true })
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(closed, item(PANEL_W_STANDARD, ABOVE_THRESHOLD)) }).left)
      .toBe(leftInset(PANEL_W_STANDARD))
  })
  it('ignores a panel that is hidden but still has a size', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_STANDARD, ABOVE_THRESHOLD, { hidden: true })) }).left)
      .toBe(BASE_LEFT)
  })
  it('stacks two open panels in one slot, with the gap between them', () => {
    // 120 + 8 + 120 = 248 > 236
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_NARROW, COMBINED_ABOVE), item(PANEL_W_WIDE, COMBINED_ABOVE))
    })
    expect(result.left).toBe(leftInset(PANEL_W_WIDE))
  })
  it('counts panels either side of buttons in a slot', () => {
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_STANDARD, COMBINED_ABOVE), buttons(), item(PANEL_W_STANDARD, COMBINED_ABOVE))
    })
    expect(result.left).toBe(leftInset(PANEL_W_STANDARD))
  })
  it('counts a panel after the controls at the bottom of the right column', () => {
    // A 260px panel, 300 tall, below the scale bar and move controls
    expect(getSafeZoneInset({ ...base(), rightBottomRef: rightBottom(buttons(), buttons(), item(260, 300)) }).right)
      .toBe(rightInset(260))
  })
})

describe('getSafeZoneInset — panels measured where they are', () => {
  it('pushes the top inset to the bottom of a wide panel below buttons', () => {
    // Buttons 60–100, then the panel 108–208
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(buttons(), item(ABOVE_W_THRESHOLD, 100)) }).top)
      .toBe(208 + GAP)
  })
  it('pushes the bottom inset to the top of a wide panel above buttons in a bottom slot', () => {
    // Buttons 512–552, then the panel 404–504 above them
    expect(getSafeZoneInset({ ...base(), rightBottomRef: rightBottom(item(ABOVE_W_THRESHOLD, 100), buttons()) }).bottom)
      .toBe(MAIN_HEIGHT - 404 + GAP)
  })
  it('matches the usual inset for a wide panel next to the footer, after buttons', () => {
    expect(getSafeZoneInset({ ...base(), rightBottomRef: rightBottom(buttons(), item(ABOVE_W_THRESHOLD, 100)) }).bottom)
      .toBe(bottomInset(100))
  })
})

// ─── Fallback when there isn't room ───────────────────────────────────────────

describe('getSafeZoneInset — fallback when there isn\'t room', () => {
  // Structural width 784, so the minimum is 196. Two 420px panels leave 900 - 438 - 438 = 24.
  const PANEL_W_HALF = 420
  // Structural height 472, so the minimum is 118. Panels 230 tall at the top and bottom leave
  // 600 - 298 - 286 = 16.
  const PANEL_H_HALF = 230

  it('uses the structural left and right insets when panels on both sides leave too little width', () => {
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_HALF, ABOVE_THRESHOLD)),
      rightTopRef: rightTop(item(PANEL_W_HALF, ABOVE_THRESHOLD))
    })
    expect(result.left).toBe(BASE_LEFT)
    expect(result.right).toBe(BASE_RIGHT)
  })
  it('still counts panels for top and bottom when only the width falls back', () => {
    // Together the two panels span the width, so they also push the top down, leaving 224 of height
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(PANEL_W_HALF, ABOVE_THRESHOLD)),
      rightTopRef: rightTop(item(PANEL_W_HALF, ABOVE_THRESHOLD))
    })
    expect(result.top).toBe(topInset(ABOVE_THRESHOLD))
  })
  it('uses the structural top and bottom insets when panels leave too little height', () => {
    // Wide, short panels top left and bottom right push the top and bottom, but neither column is
    // tall enough to clear its side. Together they leave less than 1/MIN_RATIO of the height
    const result = getSafeZoneInset({
      ...base(),
      leftTopRef: leftTop(item(ABOVE_W_THRESHOLD, PANEL_H_HALF)),
      rightBottomRef: rightBottom(item(ABOVE_W_THRESHOLD, PANEL_H_HALF))
    })
    expect(result.top).toBe(BASE_TOP)
    expect(result.bottom).toBe(BASE_BOTTOM)
    expect(result.left).toBe(BASE_LEFT)
    expect(result.right).toBe(BASE_RIGHT)
  })
  it('keeps a single panel at the cap, which leaves enough room', () => {
    expect(getSafeZoneInset({ ...base(), leftTopRef: leftTop(item(PANEL_W_XLARGE, PANEL_W_XLARGE)) }).left).toBe(CAP_WIDTH)
  })
})
