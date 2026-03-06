import { useEffect, useRef } from 'react'

let counter = 0

export default function InteractiveMapStory ({ mapConfig = {}, plugins = [] }) {
  const id = useRef(`story-map-${++counter}`).current
  const mapRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      import('../../src/index.js'),
      import('../../providers/maplibre/src/index.js')
    ]).then(([{ default: InteractiveMap }, { default: maplibreProvider }]) => {
      if (cancelled) return

      mapRef.current = new InteractiveMap(id, {
        behaviour: 'inline',
        mapProvider: maplibreProvider(),
        mapStyle: {
          url: 'https://labs.os.uk/tiles/styles/open-zoomstack-outdoor/style.json',
          attribution: `Contains OS data © Crown copyright and database rights ${new Date().getFullYear()}`,
          backgroundColor: '#f5f5f0'
        },
        center: [-1.6, 53.1],
        zoom: 6,
        containerHeight: '500px',
        enableZoomControls: true,
        ...mapConfig,
        plugins
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  return <div id={id} style={{ minHeight: '50px' }} />
}
