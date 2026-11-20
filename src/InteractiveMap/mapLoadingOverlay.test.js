import { createLoadingOverlay } from './mapLoadingOverlay.js'

/** MutationObserver callbacks deliver asynchronously — a macrotask is enough. */
const nextTask = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms))

const setup = (html = '<div id="map"></div>') => {
  document.body.innerHTML = html
  return document.getElementById('map')
}

/** Most tests assert immediate mount behaviour — skip the production show delay. */
const create = (options = {}) => createLoadingOverlay({ delay: 0, ...options })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('mounting', () => {
  it('wraps the container and covers it with an overlay sibling', () => {
    const container = setup()
    const controller = create({ container })

    const wrapper = container.parentElement
    expect(wrapper.className).toBe('im-c-map-loading-wrap')
    const overlay = wrapper.querySelector('.im-c-map-loading')
    expect(overlay).toBeTruthy()
    expect(overlay.parentElement).toBe(wrapper)
    expect(overlay.getAttribute('role')).toBe('status')
    expect(overlay.getAttribute('aria-live')).toBe('polite')
    expect(overlay.getAttribute('aria-atomic')).toBe('true')
    expect(overlay.querySelector('.im-c-map-loading__text').textContent).toBe('Loading map')
    expect(overlay.querySelector('.im-c-map-loading__spinner').getAttribute('aria-hidden')).toBe('true')
    expect(controller.isShown()).toBe(true)
    controller.destroy()
  })

  it('marks the map container busy and inert while the overlay is shown', async () => {
    const container = setup()
    const controller = create({ container })
    const overlay = document.querySelector('.im-c-map-loading')

    expect(container.getAttribute('aria-busy')).toBe('true')
    expect(container.hasAttribute('inert')).toBe(true)
    // live region busy is cleared after mount so AT announces the message
    await Promise.resolve()
    expect(overlay.getAttribute('aria-busy')).toBe('false')

    controller.dismiss()
    expect(container.hasAttribute('aria-busy')).toBe(false)
    expect(container.hasAttribute('inert')).toBe(false)
    controller.destroy()
  })

  it('does not inert a detached container (would hide the live region inside it)', () => {
    const container = document.createElement('div')
    const controller = create({ container })

    expect(container.getAttribute('aria-busy')).toBe('true')
    expect(container.hasAttribute('inert')).toBe(false)
    expect(container.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('applies live-region attrs when adopting server-rendered markup', () => {
    const container = setup(
      '<div id="map"><div class="im-c-map-loading"><span class="im-c-map-loading__text">Loading map</span></div></div>'
    )
    const controller = create({ container })
    const overlay = document.querySelector('.im-c-map-loading')

    expect(overlay.getAttribute('role')).toBe('status')
    expect(overlay.getAttribute('aria-live')).toBe('polite')
    expect(overlay.getAttribute('aria-atomic')).toBe('true')
    controller.destroy()
  })

  it('accepts a container id string', () => {
    setup()
    const controller = create({ container: 'map' })
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('reuses an existing wrapper rather than nesting', () => {
    const container = setup('<div class="im-c-map-loading-wrap"><div id="map"></div></div>')
    const wrapper = container.parentElement

    const controller = create({ container })

    expect(document.querySelectorAll('.im-c-map-loading-wrap')).toHaveLength(1)
    expect(container.parentElement).toBe(wrapper)
    expect(wrapper.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('mounts inside a detached container', () => {
    const container = document.createElement('div')
    const controller = create({ container })
    expect(container.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('adopts a server-rendered overlay instead of duplicating it', () => {
    const container = setup(
      '<div id="map"><div class="im-c-map-loading" role="status"><span class="im-c-map-loading__text">Loading map</span></div></div>'
    )
    const serverOverlay = container.querySelector('.im-c-map-loading')

    const controller = create({ container })

    expect(document.querySelectorAll('.im-c-map-loading')).toHaveLength(1)
    // adopted markup moved out of the container it would otherwise be wiped from
    expect(serverOverlay.parentElement).toBe(container.parentElement)
    expect(container.contains(serverOverlay)).toBe(false)
    controller.destroy()
  })

  it('adopts an element matching a custom selector', () => {
    const container = setup('<div id="map"><div class="my-overlay">Hold on</div></div>')
    const serverOverlay = container.querySelector('.my-overlay')

    const controller = create({ container, adopt: '.my-overlay' })

    expect(serverOverlay.parentElement).toBe(container.parentElement)
    expect(serverOverlay.classList.contains('im-c-map-loading')).toBe(true)
    expect(container.contains(serverOverlay)).toBe(false)
    controller.destroy()
  })

  it('builds its own overlay when adoption is disabled', () => {
    const container = setup('<div id="map"><div class="im-c-map-loading">server</div></div>')
    const controller = create({ container, adopt: false })

    // the server markup is untouched inside the container; the built overlay sits beside it
    const overlays = document.querySelectorAll('.im-c-map-loading')
    expect(overlays).toHaveLength(2)
    expect(container.contains(overlays[0])).toBe(true)
    const overlay = overlays[1]
    expect(overlay.parentElement).toBe(container.parentElement)
    expect(overlay.querySelector('.im-c-map-loading__spinner')).toBeTruthy()
    controller.destroy()
  })
})

describe('options', () => {
  it('replaces the default message with custom text', () => {
    const container = setup()
    const controller = create({ container, text: 'Loading projects' })
    expect(document.querySelector('.im-c-map-loading__text').textContent).toBe('Loading projects')
    controller.destroy()
  })

  it('omits the spinner when spinner is false', () => {
    const container = setup()
    const controller = create({ container, spinner: false })
    const overlay = document.querySelector('.im-c-map-loading')
    expect(overlay.querySelector('.im-c-map-loading__spinner')).toBeNull()
    expect(overlay.querySelector('.im-c-map-loading__text').textContent).toBe('Loading map')
    controller.destroy()
  })

  it('renders custom node content instead of the default spinner and text', () => {
    const container = setup()
    const content = document.createElement('p')
    content.textContent = 'Bespoke'

    const controller = create({ container, content })
    const overlay = document.querySelector('.im-c-map-loading')

    expect(overlay.textContent).toBe('Bespoke')
    expect(overlay.querySelector('.im-c-map-loading__spinner')).toBeNull()
    controller.destroy()
  })

  it('renders string content as the label, keeping the spinner', () => {
    const container = setup()
    const controller = create({ container, content: 'Fetching tiles' })
    const overlay = document.querySelector('.im-c-map-loading')

    expect(overlay.querySelector('.im-c-map-loading__spinner')).toBeTruthy()
    expect(overlay.querySelector('.im-c-map-loading__text').textContent).toBe('Fetching tiles')
    controller.destroy()
  })

  it('calls a function content with the overlay element', () => {
    const container = setup()
    const content = jest.fn((overlay) => {
      const el = document.createElement('strong')
      el.textContent = 'From fn'
      return el
    })

    const controller = create({ container, content })

    expect(content).toHaveBeenCalledWith(document.querySelector('.im-c-map-loading'))
    expect(document.querySelector('.im-c-map-loading strong').textContent).toBe('From fn')
    controller.destroy()
  })

  it('adds custom class names to the overlay', () => {
    const container = setup()
    const controller = create({ container, className: 'extra  classes' })
    const overlay = document.querySelector('.im-c-map-loading')
    expect(overlay.classList.contains('extra')).toBe(true)
    expect(overlay.classList.contains('classes')).toBe(true)
    controller.destroy()
  })

  it('applies the fullscreen modifier', () => {
    const container = setup()
    const controller = create({ container, fullscreen: true })
    expect(document.querySelector('.im-c-map-loading').classList.contains('im-c-map-loading--fullscreen')).toBe(true)
    controller.destroy()
  })

  it('applies a custom role', () => {
    const container = setup()
    const controller = create({ container, role: 'progressbar' })
    const overlay = document.querySelector('.im-c-map-loading')
    expect(overlay.getAttribute('role')).toBe('progressbar')
    expect(overlay.getAttribute('aria-live')).toBe('polite')
    controller.destroy()
  })

  it('uses assertive live updates for an alert role', () => {
    const container = setup()
    const controller = create({ container, role: 'alert' })
    const overlay = document.querySelector('.im-c-map-loading')
    expect(overlay.getAttribute('role')).toBe('alert')
    expect(overlay.getAttribute('aria-live')).toBe('assertive')
    controller.destroy()
  })
})

describe('show delay', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('waits the default 200ms before mounting', () => {
    const container = setup()
    const onShow = jest.fn()
    const controller = createLoadingOverlay({ container, onShow })

    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    expect(controller.isShown()).toBe(false)
    expect(onShow).not.toHaveBeenCalled()

    jest.advanceTimersByTime(199)
    expect(document.querySelector('.im-c-map-loading')).toBeNull()

    jest.advanceTimersByTime(1)
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    expect(controller.isShown()).toBe(true)
    expect(onShow).toHaveBeenCalledTimes(1)
    controller.destroy()
  })

  it('cancels a pending show when dismissed before the delay elapses', () => {
    const container = setup()
    const onShow = jest.fn()
    const onDismiss = jest.fn()
    const controller = createLoadingOverlay({ container, onShow, onDismiss })

    controller.dismiss('firstidle')
    jest.advanceTimersByTime(200)

    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    expect(controller.isShown()).toBe(false)
    expect(onShow).not.toHaveBeenCalled()
    // never mounted, so nothing to dismiss
    expect(onDismiss).not.toHaveBeenCalled()
    controller.destroy()
  })

  it('honours a custom delay', () => {
    const container = setup()
    const controller = createLoadingOverlay({ container, delay: 50 })

    jest.advanceTimersByTime(49)
    expect(controller.isShown()).toBe(false)

    jest.advanceTimersByTime(1)
    expect(controller.isShown()).toBe(true)
    controller.destroy()
  })

  it('starts the safety timeout only after the delayed mount', () => {
    const container = setup()
    const onDismiss = jest.fn()
    const controller = createLoadingOverlay({ container, delay: 200, timeout: 100, onDismiss })

    jest.advanceTimersByTime(200)
    expect(controller.isShown()).toBe(true)

    jest.advanceTimersByTime(99)
    expect(onDismiss).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledWith('timeout')
    controller.destroy()
  })
})

describe('dismissal', () => {
  it('dismiss removes the overlay and is safe to call twice', () => {
    const container = setup()
    const controller = create({ container })

    controller.dismiss()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    expect(() => controller.dismiss()).not.toThrow()
    controller.destroy()
  })

  it('dismisses when the component renders its error markup', async () => {
    const container = setup()
    const controller = create({ container })

    container.innerHTML = '<div class="im-c-error">There was a problem loading the map.</div>'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    controller.destroy()
  })

  it('does not mount over a container already showing an error', () => {
    const container = setup('<div id="map"><div class="im-c-error">err</div></div>')
    const controller = create({ container })
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    expect(controller.isShown()).toBe(false)
    controller.destroy()
  })

  it('dismisses when a custom errorSelector matches', async () => {
    const container = setup()
    const controller = create({ container, errorSelector: '.my-error' })

    container.innerHTML = '<div class="my-error">failed</div>'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    controller.destroy()
  })

  it('ignores the error markup when errorSelector is falsy', async () => {
    const container = setup()
    const controller = create({ container, errorSelector: false })

    container.innerHTML = '<div class="im-c-error">failed</div>'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('leaves the overlay alone for mutations without an error marker', async () => {
    const container = setup()
    const controller = create({ container })

    container.innerHTML = '<div>still loading</div>'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('dismisses on the safety timeout', async () => {
    const container = setup()
    const controller = create({ container, timeout: 5 })
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    await nextTask(30)
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    controller.destroy()
  })

  it('leaves dismissal to the event and error paths when timeout is 0', async () => {
    const container = setup()
    const controller = create({ container, timeout: 0 })
    await nextTask(30)
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('reports the dismissal reason to onDismiss', async () => {
    const container = setup()
    const onDismiss = jest.fn()
    const controller = create({ container, timeout: 5, onDismiss })

    controller.dismiss()
    expect(onDismiss).toHaveBeenLastCalledWith('manual')

    controller.show()
    await nextTask(30)
    expect(onDismiss).toHaveBeenLastCalledWith('timeout')
    controller.destroy()
  })

  it('calls onShow when the overlay mounts', () => {
    const container = setup()
    const onShow = jest.fn()
    const controller = create({ container, onShow })
    expect(onShow).toHaveBeenCalledTimes(1)

    controller.dismiss()
    controller.show()
    expect(onShow).toHaveBeenCalledTimes(2)
    controller.destroy()
  })
})

describe('deferred mode', () => {
  it('stays hidden until the launcher is hidden', async () => {
    document.body.innerHTML = '<div id="host"><a id="launcher" href="#">Show map</a><div id="map"></div></div>'
    const container = document.getElementById('map')
    const launcher = document.getElementById('launcher')

    const controller = create({ container, deferred: true })

    // the launcher is added after plugin creation (by the map) and starts visible
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()

    launcher.style.display = 'none'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('activates when a launcher added later is hidden', async () => {
    document.body.innerHTML = '<div id="host"><div id="map"></div></div>'
    const container = document.getElementById('map')
    const host = document.getElementById('host')

    const controller = create({ container, deferred: true })

    // the map inserts its open button before the container after construction
    const launcher = document.createElement('a')
    host.insertBefore(launcher, container)
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()

    launcher.style.display = 'none'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('activates when a seen launcher is removed from the DOM', async () => {
    document.body.innerHTML = '<div id="host"><a id="launcher"></a><div id="map"></div></div>'
    const container = document.getElementById('map')
    const launcher = document.getElementById('launcher')

    const controller = create({ container, deferred: true })
    await nextTask()

    launcher.remove()
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('does not activate while the launcher stays visible', async () => {
    document.body.innerHTML = '<div id="host"><a id="launcher"></a><div id="map"></div></div>'
    const container = document.getElementById('map')

    const controller = create({ container, deferred: true })
    await nextTask(30)
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    expect(controller.isShown()).toBe(false)
    controller.destroy()
  })

  it('cannot watch a detached container - it waits for an explicit show()', async () => {
    const container = document.createElement('div')
    const controller = create({ container, deferred: true })
    await nextTask(30)
    expect(controller.isShown()).toBe(false)

    controller.show()
    expect(controller.isShown()).toBe(true)
    controller.destroy()
  })

  it('re-arms for the next open after the app closes back to the launcher', async () => {
    document.body.innerHTML = '<div id="host"><a id="launcher"></a><div id="map"></div></div>'
    const container = document.getElementById('map')
    const launcher = document.getElementById('launcher')

    const controller = create({ container, deferred: true })
    await nextTask()

    // open: launcher hidden -> overlay shows; idle -> dismissed
    launcher.style.display = 'none'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.dismiss('firstidle')
    expect(document.querySelector('.im-c-map-loading')).toBeNull()

    // close back to the launcher, then open again - the overlay covers the reload
    launcher.style.display = ''
    await nextTask()
    launcher.style.display = 'none'
    await nextTask()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('respects the show delay after deferred activation and on re-arm', async () => {
    jest.useFakeTimers()
    document.body.innerHTML = '<div id="host"><a id="launcher"></a><div id="map"></div></div>'
    const container = document.getElementById('map')
    const launcher = document.getElementById('launcher')

    // production defaults for buttonFirst/hybrid: deferred + 200ms delay
    const controller = createLoadingOverlay({ container, deferred: true, delay: 200 })

    launcher.style.display = 'none'
    await jest.advanceTimersByTimeAsync(0)
    expect(controller.isShown()).toBe(false)

    await jest.advanceTimersByTimeAsync(200)
    expect(controller.isShown()).toBe(true)

    controller.dismiss('firstidle')
    launcher.style.display = ''
    await jest.advanceTimersByTimeAsync(0)
    launcher.style.display = 'none'
    await jest.advanceTimersByTimeAsync(0)
    expect(controller.isShown()).toBe(false)

    await jest.advanceTimersByTimeAsync(200)
    expect(controller.isShown()).toBe(true)

    controller.destroy()
    jest.useRealTimers()
  })
})

describe('lifecycle', () => {
  it('show() re-mounts a dismissed overlay', () => {
    const container = setup()
    const controller = create({ container })
    controller.dismiss()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()

    controller.show()
    expect(document.querySelector('.im-c-map-loading')).toBeTruthy()
    controller.destroy()
  })

  it('show() does not re-mount over an error marker', () => {
    const container = setup()
    const controller = create({ container })
    controller.dismiss()

    container.innerHTML = '<div class="im-c-error">failed</div>'
    controller.show()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    controller.destroy()
  })

  it('destroy removes the overlay and stops all watchers', async () => {
    document.body.innerHTML = '<div id="host"><a id="launcher"></a><div id="map"></div></div>'
    const container = document.getElementById('map')
    const launcher = document.getElementById('launcher')
    const controller = create({ container, deferred: true })

    controller.destroy()
    launcher.style.display = 'none'
    container.innerHTML = '<div class="im-c-error">failed</div>'
    await nextTask()

    expect(document.querySelector('.im-c-map-loading')).toBeNull()
    // a destroyed controller stays down even if show() is called
    controller.show()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
  })

  it('without a container all helpers are inert', () => {
    const controller = createLoadingOverlay()
    expect(controller.isShown()).toBe(false)
    expect(() => {
      controller.show()
      controller.dismiss()
      controller.destroy()
    }).not.toThrow()
    expect(document.querySelector('.im-c-map-loading')).toBeNull()
  })
})
