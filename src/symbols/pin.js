export const pin = {
  id: 'pin',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.9], // NOSONAR
  graphic: 'M8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.241 5-5-2.24-5-5-5z',
  svg: `<path d="M19 33.499c-5.318-5-12-9.509-12-16.998 0-6.583 5.417-12 12-12s12 5.417 12 12c0 7.489-6.682 11.998-12 16.998z" fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="M19 33.499c-5.318-5-12-9.509-12-16.998 0-6.583 5.417-12 12-12s12 5.417 12 12c0 7.489-6.682 11.998-12 16.998z" fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <g transform="translate(19, 16) scale(0.8) translate(-8, -8)"><path d="{{graphic}}" fill="{{foreground}}"/></g>`
}
