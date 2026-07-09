//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here

// Ordnance Survey Vector Tile API stylesheets, keyed by the style id used in the views
const OS_VECTOR_TILE_STYLES = {
  outdoor: process.env.VTS_OUTDOOR_URL,
  dark: process.env.VTS_DARK_URL,
  'black-and-white': process.env.VTS_BLACK_AND_WHITE_URL
}

// Cache the upstream stylesheets so we only fetch each one from GitHub once
const styleCache = {}

// Inject the OS API key into a stylesheet's tile, glyph and sprite endpoints.
// The key is kept in the .env file and added server-side so it is never committed
// to the views.
function applyOsApiKey (style, apiKey) {
  const styleWithKey = structuredClone(style)

  Object.values(styleWithKey.sources || {}).forEach((source) => {
    if (source.url?.includes('api.os.uk')) {
      source.tiles = [`https://api.os.uk/maps/vector/v1/vts/tile/{z}/{y}/{x}.pbf?srs=3857&key=${apiKey}`]
      delete source.url
    }
  })

  if (styleWithKey.glyphs?.includes('api.os.uk')) {
    styleWithKey.glyphs += `${styleWithKey.glyphs.includes('?') ? '&' : '?'}key=${apiKey}`
  }

  styleWithKey.sprite = `https://api.os.uk/maps/vector/v1/vts/resources/sprites/sprite?key=${apiKey}`

  return styleWithKey
}

// This runs on ALL pages and passes variables to Nunjucks
router.use((req, res, next) => {
  res.locals.OS_API_KEY = process.env.OS_API_KEY
  res.locals.OS_NEAREST_URL = process.env.OS_NEAREST_URL
  
  // next() tells Express to move on to loading the actual page
  next() 
})

// Serve an OS Vector Tile API stylesheet with the API key applied, e.g.
// /os-vector-tile-styles/outdoor
router.get('/os-vector-tile-styles/:style', async (req, res) => {
  const styleId = req.params.style
  const sourceUrl = OS_VECTOR_TILE_STYLES[styleId]

  if (!sourceUrl) {
    return res.status(404).json({ error: `Unknown map style '${styleId}'` })
  }

  try {
    if (!styleCache[styleId]) {
      const response = await fetch(sourceUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch stylesheet (${response.status})`)
      }

      styleCache[styleId] = await response.json()
    }

    res.json(applyOsApiKey(styleCache[styleId], process.env.OS_API_KEY))
  } catch (error) {
    console.error(`Unable to load OS Vector Tile stylesheet '${styleId}':`, error)
    res.status(502).json({ error: 'Unable to load map style' })
  }
})
