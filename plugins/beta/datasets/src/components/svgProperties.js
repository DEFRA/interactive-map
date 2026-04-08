export const SVG_SIZE = 20
export const SVG_CENTER = SVG_SIZE / 2
const SVG_SYMBOL_SIZE = 38

// base svgProps
export const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: SVG_SIZE,
  height: SVG_SIZE,
  viewBox: `0 0 ${SVG_SIZE} ${SVG_SIZE}`,
  className: 'am-c-datasets-key-symbol',
  'aria-hidden': 'true',
  focusable: 'false'
}

export const svgSymbolProps = {
  ...svgProps,
  width: SVG_SYMBOL_SIZE,
  height: SVG_SYMBOL_SIZE,
  className: 'am-c-datasets-key-symbol am-c-datasets-key-symbol--point'
}
