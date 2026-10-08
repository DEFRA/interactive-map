// A custom shield symbol, as dataset symbolSvgContent, drawn in the default 44×44 viewBox. It
// follows the built-in symbols' layering so every variant works: the active ring (keyboard
// cursor), the selected ring, the body with its halo, then the graphic. The ring colours are set
// to 'none' when they're not shown. Each ring is a stroke centred on the body outline, so its
// visible edge reaches half its width beyond it: halo 1, selected 4, active 7. The body leaves
// at least 7 units clear of the viewBox edge for the active ring, and covers about the same area
// as the built-in square (549 units²). The graphic is centred on the shield's centroid (22, 21.5)
// at 0.8 scale, as on the built-in symbols.
const SHIELD = 'M22 7.73L34.06 12.11V21.98C34.06 29.1 29.12 34.03 22 36.77C14.88 34.03 9.94 29.1 9.94 21.98V12.11Z'

export const shieldSymbolSvg = `
  <path d="${SHIELD}" fill="none" stroke="{{activeColor}}" stroke-width="14" stroke-linejoin="round"/>
  <path d="${SHIELD}" fill="none" stroke="{{selectedColor}}" stroke-width="8" stroke-linejoin="round"/>
  <path d="${SHIELD}" fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" stroke-linejoin="round" paint-order="stroke fill"/>
  <g transform="translate(15.6 15.1) scale(0.8)"><path d="{{graphic}}" fill="{{foregroundColor}}"/></g>
`
