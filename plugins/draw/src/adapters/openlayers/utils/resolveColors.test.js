import { resolveColors } from './resolveColors.js'
import { COLORS, SIZES } from '../defaults.js'

test('without a map style, colours resolve to their light variants and defaults', () => {
  const colors = resolveColors(null)
  expect(colors.editStroke).toBe(COLORS.editStroke.light)
  expect(colors.shapeStroke).toBe(COLORS.shapeStroke) // plain value — no variants
  expect(colors.strokeWidth).toBe(SIZES.strokeWidth)
  expect(colors.mapStyleId).toBeNull()
})

test('splitter colours are resolved', () => {
  const colors = resolveColors(null)
  expect(colors.splitValid).toBe(COLORS.splitValid.light)
  expect(colors.splitInvalid).toBe(COLORS.splitInvalid.light)
})

test('a dark map style resolves dark variants and carries its id through', () => {
  const colors = resolveColors({ id: 'dark', mapColorScheme: 'dark' })
  expect(colors.editStroke).toBe(COLORS.editStroke.dark)
  expect(colors.mapStyleId).toBe('dark')
})

test('plugin config overrides beat the defaults, as strings or scheme variants', () => {
  const colors = resolveColors({ id: 'road', mapColorScheme: 'dark' }, {
    editStroke: '#custom',
    editFill: { light: '#l', dark: '#d' },
    strokeWidth: 9
  })
  expect(colors.editStroke).toBe('#custom')
  expect(colors.editFill).toBe('#d')
  expect(colors.strokeWidth).toBe(9)
  expect(colors.editVertex).toBe(COLORS.editVertex.dark) // untouched keys still resolve
})
