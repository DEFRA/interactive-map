export const square = {
  id: 'square',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  graphic: 'M8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.241 5-5-2.24-5-5-5z',
  svg: `<path d="M28 7a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h18z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M28 7a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h18z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <g transform="translate(19, 19) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foreground}}"/></g>`
}
