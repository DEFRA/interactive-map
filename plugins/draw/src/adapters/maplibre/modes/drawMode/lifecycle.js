/**
 * Setup / teardown for the shared draw mode: binds the window/container/map event
 * handlers on entry and removes them on exit. Part of createDrawMode.
 */
export const createLifecycle = ({ ParentMode, featureProp, excludeFeatureIdFromSetup }) => ({
  onSetup (options) {
    const { map } = this

    // Some parent modes (DrawLineString) interpret featureId as "continue existing"
    // rather than "use this ID for new feature"
    const parentOptions = excludeFeatureIdFromSetup
      ? { ...options, featureId: null }
      : options

    const state = {
      ...ParentMode.onSetup.call(this, parentOptions),
      ...options
    }

    // Add initial props
    state[featureProp].properties = options.properties

    const { container, vertexMarkerId, getInterfaceType } = state
    const currentInterfaceType = getInterfaceType ? getInterfaceType() : state.interfaceType
    state.interfaceType = currentInterfaceType
    const vertexMarker = container.querySelector(`#${vertexMarkerId}`)
    state.vertexMarker = vertexMarker
    if (['touch', 'keyboard'].includes(currentInterfaceType)) {
      this._showCrossHair(state)
    } else {
      this._hideCrossHair(state)
    }

    // Bind all handlers once
    const bind = (name, fn) => (this[name] = fn.bind(this, state))
    const handlers = {
      keydownHandler: this.onKeydown,
      keyupHandler: this.onKeyup,
      blurHandler: this.onBlur,
      createHandler: this.onCreate,
      moveHandler: this.onMove,
      pointerdownHandler: this.onPointerdown,
      pointermoveHandler: this.onPointermove,
      pointerupHandler: this.onPointerup,
      vertexButtonClickHandler: this.onVertexButtonClick,
      undoHandler: this.onUndo
    }
    Object.entries(handlers).forEach(([k, fn]) => bind(k, fn))

    // Register events
    this._listeners = [
      [window, 'keydown', this.keydownHandler],
      [window, 'keyup', this.keyupHandler],
      [window, 'click', this.vertexButtonClickHandler],
      [container, 'blur', this.blurHandler],
      [container, 'pointermove', this.pointermoveHandler],
      [container, 'pointerup', this.pointerupHandler],
      [map, 'pointerdown', this.pointerdownHandler],
      [map, 'draw.create', this.createHandler],
      [map, 'move', this.moveHandler],
      [map, 'draw.undo', this.undoHandler]
    ]
    this._listeners.forEach(([t, e, h]) => t.addEventListener ? t.addEventListener(e, h) : t.on(e, h))

    return state
  },

  onStop (state) {
    ParentMode.onStop.call(this, state)
    this._listeners.forEach(([t, e, h]) => t.removeEventListener ? t.removeEventListener(e, h) : t.off(e, h))
    this._hideCrossHair(state)
    // Sync the final interfaceType from draw mode back to app state so crosshair
    // visibility is correct when exiting draw mode (e.g., if user switched from mouse to keyboard)
    this.map.fire('draw.interfacetypechange', { interfaceType: state.interfaceType })
  }
})
