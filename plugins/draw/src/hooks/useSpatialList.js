import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { scaleFactor } from '../../../../src/config/appConfig.js'
import { ADAPTER_EVENTS } from '../adapterEvents.js'

const EDIT_VERTEX_MODE = 'edit_vertex'
const DRAW_PROVIDER_ID = 'draw'

// Mirrors interact's own projectToScreen (plugins/interact/src/hooks/useSpatialList.js) —
// mapProvider.mapToScreen is the provider-agnostic projection every mapProvider implements,
// not any adapter-internal pixel conversion.
const projectToScreen = (mapProvider, mapSize, coord) => {
  const { x, y } = mapProvider.mapToScreen(coord)
  return { x: x * scaleFactor[mapSize], y: y * scaleFactor[mapSize] }
}

// ids stay flat vertices-then-midpoints indices — matches the mode's own selectedVertexIndex
// convention on both adapters (see the adapters' getVertexItems() doc comments) and is what
// selectVertex/insertVertexAtMidpoint expect, so it's unrelated to display order. The array
// order below is interleaved for display only: Point 1, Insert 1-2, Point 2, ... The "between
// N and M" label (and this interleave) only reads correctly for a single ring/part (the
// common case); a shape with holes or multiple parts would need ring-aware numbering to stay
// accurate, not done here.
const buildVertexItems = (mapProvider, mapSize) => {
  const { vertices, midpoints } = mapProvider.draw?.getVertexItems?.() ?? { vertices: [], midpoints: [] }
  const toVertexItem = (coord, i) => ({
    id: String(i),
    label: `Point ${i + 1}`,
    isMidpoint: false,
    ...projectToScreen(mapProvider, mapSize, coord)
  })
  const toMidpointItem = (coord, i) => ({
    id: String(vertices.length + i),
    // Kept as short as possible — a voice user hears/reads this in full each time, and
    // "Insert point between N and M" was long enough to lose.
    label: `Insert ${i + 1}-${((i + 1) % vertices.length) + 1}`,
    isMidpoint: true,
    ...projectToScreen(mapProvider, mapSize, coord)
  })
  const items = []
  vertices.forEach((coord, i) => {
    items.push(toVertexItem(coord, i))
    if (i < midpoints.length) {
      items.push(toMidpointItem(midpoints[i], i))
    }
  })
  return items
}

/**
 * Rebuilds the vertex/midpoint item list whenever edit_vertex is entered/left, on every
 * geometry change, and on every map move (pan/zoom moves each item's screen position even
 * though the underlying geographic coordinate hasn't changed — same reason interact's own
 * hook rebuilds on MAP_MOVE_END). Keeps the result in itemsRef for useConfirmHandler to
 * resolve against later, and registers as an exclusive spatialListRegistry provider —
 * claiming ownership while edit_vertex is active (interact's own items are excluded
 * meanwhile, restored automatically once the claim is released) rather than contributing
 * additively like interact does.
 */
function useVertexItemSync ({ pluginState, mapProvider, mapSize, spatialListRegistry, itemsRef, eventBus }) {
  useEffect(() => {
    const rebuild = () => {
      itemsRef.current = pluginState.mode === EDIT_VERTEX_MODE ? buildVertexItems(mapProvider, mapSize) : []
      spatialListRegistry.notifyItemsChanged(DRAW_PROVIDER_ID)
    }
    rebuild()
    eventBus.on(EVENTS.MAP_MOVE_END, rebuild)
    const { draw } = mapProvider
    if (!draw) {
      return () => eventBus.off(EVENTS.MAP_MOVE_END, rebuild)
    }
    draw.on(ADAPTER_EVENTS.UPDATE, rebuild)
    return () => {
      eventBus.off(EVENTS.MAP_MOVE_END, rebuild)
      draw.off(ADAPTER_EVENTS.UPDATE, rebuild)
    }
  }, [pluginState.mode, mapProvider, mapSize, spatialListRegistry, itemsRef, eventBus])

  // Registers once, for the lifetime of the hook — safe outside edit_vertex too, since an
  // exclusive-capable provider only ever contributes while it holds the claim (see
  // spatialListRegistry.js). Declared after the effect above for the same initial-recompute
  // ordering reason interact's own hook documents.
  useEffect(() => {
    spatialListRegistry.registerItemProvider(DRAW_PROVIDER_ID, {
      // focusable: false — Tab-only keyboard users already have a full path via the map's own
      // arrow-key nudge/Alt+Arrow navigate, so this list exists purely for Voice Control and a
      // screen reader's own virtual-cursor discovery + activation. See SpatialList.jsx's own
      // comment on why forcing every item's tabIndex to -1 is deliberate here.
      getItems: () => ({ items: itemsRef.current, multiselectable: false, label: 'Shape points', focusable: false }),
      exclusive: true
    })
    return () => { spatialListRegistry.unregisterItemProvider(DRAW_PROVIDER_ID) }
  }, [spatialListRegistry, itemsRef])

  useEffect(() => {
    if (pluginState.mode !== EDIT_VERTEX_MODE) {
      return undefined
    }
    spatialListRegistry.claimExclusive(DRAW_PROVIDER_ID)
    return () => spatialListRegistry.releaseExclusive(DRAW_PROVIDER_ID)
  }, [pluginState.mode, spatialListRegistry])
}

/**
 * Listens for MAP_SET_ACTIVE_ITEM and previews (non-destructively) whichever vertex or
 * midpoint the listbox cursor is now on — every arrow-key move through the list, mirroring
 * how mouse/touch/keyboard selection already behaves live elsewhere in edit_vertex. Unlike
 * interact's real map features (which need an explicit Enter/Space confirm before anything
 * happens), there's no separate "preview" step for a real vertex anywhere else in this mode —
 * arrowing onto one already is the live selection. A midpoint is also just previewed here;
 * confirming the actual insert is useConfirmHandler's job below.
 */
function useActiveVertexHandler ({ eventBus, mapProvider, pluginState, activeIdRef }) {
  useEffect(() => {
    const handle = ({ id }) => {
      activeIdRef.current = id
      if (id === null || pluginState.mode !== EDIT_VERTEX_MODE) {
        return
      }
      mapProvider.draw?.selectVertex?.(Number(id))
    }
    eventBus.on(EVENTS.MAP_SET_ACTIVE_ITEM, handle)
    return () => { eventBus.off(EVENTS.MAP_SET_ACTIVE_ITEM, handle) }
  }, [eventBus, mapProvider, pluginState.mode, activeIdRef])
}

/**
 * Handles MAP_SELECT_ITEM (Enter/Space, or a click/Voice-Control click — and, since none of
 * these items are ever a real Tab stop, a screen reader's own virtual-cursor activation gesture
 * too, which likewise fires as a click — all three arrive here identically). For a midpoint,
 * this is the destructive step: commits a new vertex there (a real vertex is already the live
 * selection the moment it's previewed, so confirming one doesn't change anything on the map).
 * Either way, confirming announces what happened and hands keyboard focus back to the viewport
 * — landing the user exactly where the pre-existing, untouched arrow-key nudge/Alt+Arrow flow
 * already works, same as if they'd selected that point with a mouse click. This is deliberately
 * unconditional (not just for midpoints) so every input path ends up in the same place.
 */
function useConfirmHandler ({ eventBus, mapProvider, pluginState, activeIdRef, itemsRef, viewportRef, announce }) {
  useEffect(() => {
    const handleConfirm = () => {
      if (pluginState.mode !== EDIT_VERTEX_MODE || activeIdRef.current === null) {
        return
      }
      const item = itemsRef.current.find(i => i.id === activeIdRef.current)
      if (!item) {
        return
      }
      if (item.isMidpoint) {
        mapProvider.draw?.insertVertexAtMidpoint?.(Number(activeIdRef.current))
        announce('New point inserted', 'action')
      } else {
        announce(`${item.label} selected`, 'action')
      }
      viewportRef.current?.focus()
    }
    eventBus.on(EVENTS.MAP_SELECT_ITEM, handleConfirm)
    return () => { eventBus.off(EVENTS.MAP_SELECT_ITEM, handleConfirm) }
  }, [eventBus, mapProvider, pluginState.mode, activeIdRef, itemsRef, viewportRef, announce])
}

/**
 * Orchestrates the accessible (Voice Control / screen-reader-discoverable) vertex/midpoint
 * targets for draw's edit_vertex mode. Mirrors plugins/interact/src/hooks/useSpatialList.js's
 * structure (item-sync + active-item concerns), but claims the registry's exclusive slot
 * instead of contributing additively, declares focusable: false (no real Tab stop — see
 * useVertexItemSync's own comment on why), and splits "preview" (any listbox move, non-
 * destructive) from "confirm" (inserts at a midpoint, then always hands focus back to the
 * viewport) rather than interact's own "preview, then explicit confirm for everything" split.
 *
 * @param {{ mapState: object, pluginState: object, services: object, mapProvider: object, spatialListRegistry: object, viewportRef: React.RefObject }} params
 */
export function useSpatialList ({ mapState, pluginState, services, mapProvider, spatialListRegistry, viewportRef }) {
  const { mapSize } = mapState
  const { eventBus, announce } = services
  const itemsRef = useRef([])
  const activeIdRef = useRef(null)
  useVertexItemSync({ pluginState, mapProvider, mapSize, spatialListRegistry, itemsRef, eventBus })
  useActiveVertexHandler({ eventBus, mapProvider, pluginState, activeIdRef })
  useConfirmHandler({ eventBus, mapProvider, pluginState, activeIdRef, itemsRef, viewportRef, announce })
}
