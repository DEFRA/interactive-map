# Map key style guide

A standalone gallery for building map key presentation components — colour ramps, symbols,
the key container itself — outside of the live map. It exists on its own on purpose:

**This folder must never `@use`/import anything from `src/` or `plugins/`.** Every token,
reset rule, and component stylesheet here is a duplicated snapshot, copied by hand, not a
live link to production. That's what lets a component be reshaped or experimented on here
(new states, new colours, a rule that doesn't exist in production yet — see the "Prototype
addition" block in `components/map-key/map-key.scss` for an example) without ever touching,
or being constrained by, the real map.

The tradeoff is drift: nothing here updates automatically when the real source changes. If a
specimen ever looks wrong next to the real app, that's expected eventually — re-diff it
against the source files named in its own header comment, don't assume the specimen is lying.

## Workflow

1. **Duplicate** — copy the relevant markup/CSS from the real component into a new
   `style-guide/components/<name>/` folder. Keep the same class names (BEM, `im-c-*`/`am-c-*`)
   so porting back later is a copy-paste, not a rename.
2. **Iterate** — reshape it here freely. Reuse tokens from `scss/_tokens.scss` rather than
   hardcoding colours, so specimens stay consistent with the app's actual palette.
3. **Check both themes** — every specimen renders twice, side by side (see `index.html`):
   once plain, once wrapped in `im-o-app--dark-app`, the same class the app's real dark-mode
   tokens key off (`scss/_tokens.scss`). GOV.UK has no dark theme of its own, so this is
   always driven by the app's own tokens, not govuk classes.
4. **Approve** — once a design is settled, port its markup/CSS back into the real component
   (`plugins/map-key/...` or wherever it belongs) by hand. The specimen can stay in the style
   guide afterwards as a reference, or get deleted — either is fine.

## Adding a specimen

```
style-guide/components/<name>/
  <name>.html   — markup fragment, static/pre-resolved (no React, no live registry lookups)
  <name>.scss   — duplicated CSS, plus a header comment naming what it was copied from
```

Then:
- add `@use '../components/<name>/<name>';` to `scss/style-guide.scss`
- add a `<section class="sg-specimen" data-fragment="components/<name>/<name>.html">` block
  to `index.html`, with a `.sg-specimen__variants` pair for light/dark (copy the existing
  `map-key` section as a template)

`js/style-guide.js` fetches each fragment and injects it into every `.sg-specimen__stage`
inside that section automatically — no wiring needed per specimen beyond the two steps above.

## Running it

`npm run dev` (or `npm run webpack:serve`), then open `http://localhost:8080/style-guide/`.
Restart the dev server after editing `webpack.dev.mjs` (new entries/static mounts aren't
picked up by hot reload) — not needed for day-to-day specimen work.
