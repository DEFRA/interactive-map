import { classifyPanel, getPanelRole } from './getPanelRole.js'

describe('classifyPanel', () => {
  it('is a dialog when dismissible and not a persistent side aside', () => {
    expect(classifyPanel({ slot: 'right-top', open: false })).toMatchObject({
      isModal: false,
      isAside: false,
      isDismissible: true,
      isDialog: true
    })
  })

  it('is an aside (not a dialog) for a persistently open side panel', () => {
    expect(classifyPanel({ slot: 'side', open: true })).toMatchObject({
      isAside: true,
      isDialog: false
    })
  })

  it('is never an aside when modal, even in the side slot', () => {
    expect(classifyPanel({ slot: 'side', open: true, modal: true })).toMatchObject({
      isModal: true,
      isAside: false,
      isDismissible: true,
      isDialog: true
    })
  })

  it('treats dismissible: false as non-dismissible unless modal forces it', () => {
    expect(classifyPanel({ slot: 'right-top', open: false, dismissible: false })).toMatchObject({
      isDismissible: false,
      isDialog: false
    })
  })

  it('modal forces dismissible regardless of an explicit dismissible: false', () => {
    expect(classifyPanel({ slot: 'right-top', open: false, dismissible: false, modal: true })).toMatchObject({
      isDismissible: true,
      isDialog: true
    })
  })
})

describe('getPanelRole', () => {
  it('returns dialog when isDialog', () => {
    expect(getPanelRole({ isDialog: true, isDismissible: true })).toBe('dialog')
  })

  it('returns complementary when dismissible but not a dialog', () => {
    expect(getPanelRole({ isDialog: false, isDismissible: true })).toBe('complementary')
  })

  it('returns region when neither a dialog nor dismissible', () => {
    expect(getPanelRole({ isDialog: false, isDismissible: false })).toBe('region')
  })
})
