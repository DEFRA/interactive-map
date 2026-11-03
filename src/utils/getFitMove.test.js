import { getFitMove, normalisePaddingPercent } from './getFitMove.js'

// A 400 × 200 safe zone, from (100, 50) to (500, 250)
const safeZone = { left: 100, top: 50, right: 500, bottom: 250 }

describe('normalisePaddingPercent', () => {
  test('defaults every side to 0', () => {
    expect(normalisePaddingPercent()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(normalisePaddingPercent(null)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  test('applies one value to every side', () => {
    expect(normalisePaddingPercent(10)).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  test('takes each side from an object, defaulting missing sides to 0', () => {
    expect(normalisePaddingPercent({ top: 5, left: 10 })).toEqual({ top: 5, right: 0, bottom: 0, left: 10 })
  })

  test('limits each side to 0–25', () => {
    expect(normalisePaddingPercent(40)).toEqual({ top: 25, right: 25, bottom: 25, left: 25 })
    expect(normalisePaddingPercent({ top: -5, right: 30 })).toEqual({ top: 0, right: 25, bottom: 0, left: 0 })
  })

  test('treats a value that is not a number as 0', () => {
    expect(normalisePaddingPercent('lots')).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('getFitMove', () => {
  describe('without preferPan', () => {
    test('always fits, with no margin by default', () => {
      const box = { left: 200, top: 100, right: 300, bottom: 150 }
      expect(getFitMove({ box, safeZone })).toEqual({ type: 'fit', margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    })

    test('works out the margin from the safe zone width for left and right, and its height for top and bottom', () => {
      expect(getFitMove({ safeZone, paddingPercent: 10 })).toEqual({ type: 'fit', margin: { top: 20, right: 40, bottom: 20, left: 40 } })
    })

    test('works out each side separately', () => {
      expect(getFitMove({ safeZone, paddingPercent: { top: 5, left: 25 } })).toEqual({ type: 'fit', margin: { top: 10, right: 0, bottom: 0, left: 100 } })
    })
  })

  describe('with preferPan', () => {
    test('doesn\'t move a box already inside the safe zone', () => {
      const box = { left: 110, top: 60, right: 200, bottom: 100 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'none' })
    })

    test('doesn\'t move a box inside the safe zone but within its margin', () => {
      const box = { left: 105, top: 55, right: 200, bottom: 100 }
      expect(getFitMove({ box, safeZone, preferPan: true, paddingPercent: 10 })).toEqual({ type: 'none' })
    })

    test('pans a box inside the safe zone but under a panel', () => {
      // A small panel the safe zone leaves out, over the box. Box centre (150, 75)
      const box = { left: 140, top: 70, right: 160, bottom: 80 }
      const panels = [{ left: 100, top: 50, right: 300, bottom: 120 }]
      expect(getFitMove({ box, safeZone, panels, preferPan: true })).toEqual({ type: 'pan', offset: [-150, -75] })
    })

    test('doesn\'t move a box inside the safe zone and clear of every panel', () => {
      const box = { left: 400, top: 200, right: 450, bottom: 240 }
      const panels = [{ left: 100, top: 50, right: 300, bottom: 120 }]
      expect(getFitMove({ box, safeZone, panels, preferPan: true })).toEqual({ type: 'none' })
    })

    test('pans a box that fits to the centre of the safe zone', () => {
      // Box centre (550, 300), safe zone centre (300, 150)
      const box = { left: 500, top: 250, right: 600, bottom: 350 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'pan', offset: [250, 150] })
    })

    test('pans a box that is partly outside the safe zone', () => {
      // Box centre (110, 150), safe zone centre (300, 150)
      const box = { left: 60, top: 100, right: 160, bottom: 200 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'pan', offset: [-190, 0] })
    })

    test('pans a point to the centre of the safe zone', () => {
      const box = { left: 0, top: 0, right: 0, bottom: 0 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'pan', offset: [-300, -150] })
    })

    test('centres in the safe zone less its margin when the sides differ', () => {
      // Inner area (200, 50) to (500, 250), centre (350, 150)
      const box = { left: 0, top: 100, right: 100, bottom: 200 }
      expect(getFitMove({ box, safeZone, preferPan: true, paddingPercent: { left: 25 } })).toEqual({ type: 'pan', offset: [-300, 0] })
    })

    test('fits a box too wide for the safe zone', () => {
      const box = { left: 0, top: 100, right: 450, bottom: 150 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'fit', margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    })

    test('fits a box too tall for the safe zone', () => {
      const box = { left: 0, top: 0, right: 100, bottom: 250 }
      expect(getFitMove({ box, safeZone, preferPan: true })).toEqual({ type: 'fit', margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    })

    test('fits a box that fits the safe zone but not the safe zone less its margin', () => {
      // 360 wide fits the 400 safe zone, not the 320 left after 10% each side
      const box = { left: 0, top: 100, right: 360, bottom: 150 }
      expect(getFitMove({ box, safeZone, preferPan: true, paddingPercent: 10 })).toEqual({ type: 'fit', margin: { top: 20, right: 40, bottom: 20, left: 40 } })
    })

    test('pans a box exactly the size of the safe zone less its margin', () => {
      const box = { left: 0, top: 0, right: 320, bottom: 160 }
      expect(getFitMove({ box, safeZone, preferPan: true, paddingPercent: 10 })).toEqual({ type: 'pan', offset: [-140, -70] })
    })
  })
})
