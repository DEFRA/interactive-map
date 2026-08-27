import '../scss/style-guide.scss'

// Every specimen's markup fragment gets injected into two stages — light and (wrapped in
// .im-o-app--dark-app) dark — from the SAME fetched string. Injected verbatim, that means
// two copies of every id="" in the fragment (pattern defs, group-heading ids) end up on
// the page at once. Per spec, url(#id) and aria-labelledby resolve to the FIRST matching
// id in the document regardless of which copy is asking — so the dark stage's own <rect>
// silently painted using the LIGHT stage's (un-whitened) <pattern>, even though the dark
// stage's own pattern <path> had the correct white fill (verified: right style, wrong node
// used to paint). Rewriting every id to be unique per stage before injecting fixes this at
// the source, for every current and future specimen, rather than patching it per-pattern.
let uidCounter = 0

const uniquifyIds = (markup) => {
  const suffix = `-u${uidCounter}`
  uidCounter += 1
  const ids = new Set()
  markup.replace(/\bid="([^"]+)"/g, (match, id) => {
    ids.add(id)
    return match
  })
  let result = markup
  ids.forEach((id) => {
    const newId = `${id}${suffix}`
    result = result.split(`id="${id}"`).join(`id="${newId}"`)
    result = result.split(`url(#${id})`).join(`url(#${newId})`)
    result = result.split(`aria-labelledby="${id}"`).join(`aria-labelledby="${newId}"`)
    result = result.split(`href="#${id}"`).join(`href="#${newId}"`)
  })
  return result
}

// Loads each specimen's markup fragment once, then injects a uniquified copy into every
// .sg-specimen__stage inside it — one plain, one wrapped in .im-o-app--dark-app (the
// same class the app's real dark-mode tokens key off, see
// src/scss/settings/_colors.scss) — so light and dark render side by side.
document.querySelectorAll('.sg-specimen[data-fragment]').forEach(async (specimen) => {
  const stages = specimen.querySelectorAll('.sg-specimen__stage')
  const url = specimen.dataset.fragment
  try {
    const response = await fetch(url)
    const markup = await response.text()
    stages.forEach((stage) => { stage.innerHTML = uniquifyIds(markup) })
  } catch (error) {
    stages.forEach((stage) => { stage.textContent = `Failed to load specimen: ${url}` })
    console.error(error)
  }
})
