/**
 * Built-in fill pattern SVG content.
 * Each value is the inner SVG paths only (no wrapper element).
 * Paths are authored in a 16×16 coordinate space and tile seamlessly.
 * Use {{foreground}} and {{background}} tokens for colour injection.
 */
export const BUILT_IN_PATTERNS = {
  'cross-hatch': '<path d="M0 4.486V3.485h3.5V.001h1v3.484h7.002V.001h1v3.484h3.5v1.001h-3.5v7h3.5v.999h-3.5v3.516h-1v-3.516H4.499v3.516h-1v-3.516H0v-.999h3.5v-7H0zm11.501 0H4.499v7h7.002v-7z" fill="{{foreground}}"/>',
  'diagonal-cross-hatch': '<path d="M0 8.707V7.293L7.293 0h1.414L16 7.293v1.414L8.707 16H7.293L0 8.707zM.707 8L8 15.293 15.293 8 8 .707.707 8z" fill="{{foreground}}"/>',
  'forward-diagonal-hatch': '<path d="M16 8.707V7.293L7.293 16h1.414L16 8.707zm-16 0L8.707 0H7.293L0 7.293v1.414z" fill="{{foreground}}"/>',
  'backward-diagonal-hatch': '<path d="M0 8.707V7.293L8.707 16H7.293L0 8.707zm16 0L7.293 0h1.414L16 7.293v1.414z" fill="{{foreground}}"/>',
  'horizontal-hatch': '<path d="M0 4.5V3.499h15.999V4.5H0zm0 7h15.999V12.5H0v-1.001z" fill="{{foreground}}"/>',
  'vertical-hatch': '<path d="M3.501 16.001V0h1v16.001h-1zm7.998 0V0h1v16.001h-1z" fill="{{foreground}}"/>',
  dot: '<path d="M3.999 2A2 2 0 0 1 6 3.999C6 5.103 5.103 6 3.999 6a2 2 0 0 1-1.999-2.001A2 2 0 0 1 3.999 2zm0 7.999C5.103 10 6 10.897 6 12.001A2 2 0 0 1 3.999 14a2 2 0 0 1-1.999-1.999A2 2 0 0 1 3.999 10zM11.999 2A2 2 0 0 1 14 3.999C14 5.103 13.103 6 11.999 6S10 5.103 10 3.999A2 2 0 0 1 11.999 2zm0 7.999c1.104 0 2.001.897 2.001 2.001A2 2 0 0 1 11.999 14 2 2 0 0 1 10 12.001c0-1.104.897-2.001 1.999-2.001z" fill="{{foreground}}"/>',
  diamond: '<path d="M4 .465L7.535 4 4 7.535.465 4 4 .465zm0 7.999l3.535 3.535L4 15.535.465 11.999 4 8.464zm8-8l3.535 3.535-3.536 3.536L8.464 4 12 .464zm0 8.001L15.536 12 12 15.536 8.465 12 12 8.465z" fill="{{foreground}}"/>'
}
