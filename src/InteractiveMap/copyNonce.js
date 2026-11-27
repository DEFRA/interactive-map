// Added to the start of every engine package's UMD entry (see webpack.engine.umd.mjs). Copies
// the nonce from the <script> tag that loaded the entry to the <script> tags webpack adds for
// lazy files, so they're allowed by a nonce-based Content Security Policy.
const nonce = document.currentScript?.nonce
if (nonce) {
  __webpack_nonce__ = nonce // eslint-disable-line no-undef, camelcase
}
