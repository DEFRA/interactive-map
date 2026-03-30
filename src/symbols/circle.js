export const circle = {
  id: 'circle',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  svg: `<path d="M19 7C12.376 7 7 12.376 7 19s5.376 12 12 12a12.01 12.01 0 0 0 12-12A12.01 12.01 0 0 0 19 7z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M19 7C12.376 7 7 12.376 7 19s5.376 12 12 12a12.01 12.01 0 0 0 12-12A12.01 12.01 0 0 0 19 7z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <path d="M19 14c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.241 5-5-2.24-5-5-5z" fill="{{foreground}}"/>`
}
