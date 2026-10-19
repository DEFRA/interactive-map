import { svgSymbolProps, SVG_SYMBOL_SIZE, KEY_SYMBOL_MAX_SIZE } from './svgProperties.js'

const HALF = 0.5

// keySymbol is symbolRegistry.getKeySymbol's { svg, viewBox }
export const KeySvgSymbol = ({ keySymbol }) => {
  const { svg, viewBox } = keySymbol ?? {}
  if (!(svg && viewBox)) {
    return null
  }

  // Drawn 1:1 (one viewBox unit per pixel, as on the map) and centred in the key's fixed square.
  // Symbols vary in size (pin's tail, triangle's width), so the square lets them overflow it
  // rather than shrinking the larger ones; only a symbol bigger than KEY_SYMBOL_MAX_SIZE is
  // scaled down. The nested svg clips to the symbol's own viewBox, the same as on the map.
  const [,, width, height] = viewBox.split(' ').map(Number)
  const scale = Math.min(1, KEY_SYMBOL_MAX_SIZE / Math.max(width, height))
  const drawnWidth = width * scale
  const drawnHeight = height * scale

  // The symbol is decorative: the key item's text labels it. The outer svg is aria-hidden via
  // svgSymbolProps, which already hides the inner one; the inner one repeats aria-hidden so it
  // can't be exposed as a second, unnamed graphic.
  return (
    <svg {...svgSymbolProps} overflow='visible'>
      <svg
        aria-hidden='true'
        x={(SVG_SYMBOL_SIZE - drawnWidth) * HALF}
        y={(SVG_SYMBOL_SIZE - drawnHeight) * HALF}
        width={drawnWidth}
        height={drawnHeight}
        viewBox={viewBox}
        overflow='hidden'
      >
        <g dangerouslySetInnerHTML={{ __html: svg }} />
      </svg>
    </svg>
  )
}
