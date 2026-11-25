/**
 * @jest-environment jsdom
 */

import { createLoadingOverlay } from './mapLoadingOverlay.js'

const TIMEOUT = 30000

const getOverlay = () => document.querySelector('.im-c-map-loading')

let container

beforeEach(() => {
  jest.useFakeTimers()
  document.body.innerHTML = '<div id="map"></div>'
  container = document.getElementById('map')
})

afterEach(() => {
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('show', () => {
  it('waits 200ms before adding the overlay to the container', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })

    jest.advanceTimersByTime(199)
    expect(getOverlay()).toBeNull()

    jest.advanceTimersByTime(1)
    expect(getOverlay().parentElement).toBe(container)
  })

  it('shows the message but hides the overlay from screen readers', () => {
    const loading = createLoadingOverlay({ text: 'Loading flood map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })
    jest.advanceTimersByTime(200)

    const overlay = getOverlay()
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
    expect(overlay.hasAttribute('role')).toBe(false)
    expect(overlay.querySelector('.im-c-map-loading__text').textContent).toBe('Loading flood map')
  })

  it('covers the screen when the map opens fullscreen', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: true })
    jest.advanceTimersByTime(200)

    expect(getOverlay().classList.contains('im-c-map-loading--fullscreen')).toBe(true)
  })
})

describe('attachTo', () => {
  it('moves a shown overlay into the app and keeps its animations in step', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: true })
    jest.advanceTimersByTime(200)
    const overlay = getOverlay()
    expect(overlay.style.animationDelay).toBe('-0ms')

    jest.advanceTimersByTime(300)
    const appEl = document.createElement('div')
    container.appendChild(appEl)
    loading.attachTo(appEl)

    expect(overlay.parentElement).toBe(appEl)
    expect(overlay.classList.contains('im-c-map-loading--fullscreen')).toBe(false)
    expect(overlay.style.animationDelay).toBe('-300ms')
    expect(overlay.querySelector('.im-c-map-loading__spinner').style.animationDelay).toBe('-300ms')
  })

  it('shows the overlay in the app if it mounts during the delay', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })
    const appEl = document.createElement('div')
    container.appendChild(appEl)

    loading.attachTo(appEl)
    expect(getOverlay()).toBeNull()

    jest.advanceTimersByTime(200)
    expect(getOverlay().parentElement).toBe(appEl)
  })

  it('does nothing when the overlay is not loading', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    const appEl = document.createElement('div')
    container.appendChild(appEl)

    loading.attachTo(appEl)
    jest.runAllTimers()

    expect(getOverlay()).toBeNull()
  })
})

describe('dismiss', () => {
  it('removes a shown overlay', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })
    jest.runAllTimers()

    loading.dismiss()
    expect(getOverlay()).toBeNull()
  })

  it('stops the overlay appearing on fast loads', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })

    jest.advanceTimersByTime(100)
    loading.dismiss()
    jest.runAllTimers()

    expect(getOverlay()).toBeNull()
  })

  it('starts its animations from the beginning when shown again', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    loading.show({ container, isFullscreen: false })
    jest.advanceTimersByTime(500)
    loading.dismiss()

    loading.show({ container, isFullscreen: false })
    jest.advanceTimersByTime(200)

    expect(getOverlay().style.animationDelay).toBe('-0ms')
  })
})

describe('isLoading', () => {
  it('is true from show until dismiss, even before the overlay appears', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    expect(loading.isLoading()).toBe(false)

    loading.show({ container, isFullscreen: false })
    expect(loading.isLoading()).toBe(true)

    loading.dismiss()
    expect(loading.isLoading()).toBe(false)
  })
})

describe('timeout', () => {
  it('ends loading if the map has not loaded in time', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    const listener = jest.fn()
    loading.onDismiss(listener)
    loading.show({ container, isFullscreen: false })

    jest.advanceTimersByTime(TIMEOUT - 1)
    expect(loading.isLoading()).toBe(true)

    jest.advanceTimersByTime(1)
    expect(loading.isLoading()).toBe(false)
    expect(getOverlay()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(loading.hasTimedOut()).toBe(true)

    loading.show({ container, isFullscreen: false })
    expect(loading.hasTimedOut()).toBe(false)
  })

  it('never ends loading when the timeout is 0', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: 0 })
    loading.show({ container, isFullscreen: false })

    jest.runAllTimers()

    expect(loading.isLoading()).toBe(true)
    expect(loading.hasTimedOut()).toBe(false)
  })

  it('is cancelled when loading ends first', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    const listener = jest.fn()
    loading.onDismiss(listener)
    loading.show({ container, isFullscreen: false })

    loading.dismiss()
    jest.runAllTimers()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(loading.hasTimedOut()).toBe(false)
  })
})

describe('onDismiss', () => {
  it('calls listeners only when loading ends, until they stop listening', () => {
    const loading = createLoadingOverlay({ text: 'Loading map', timeout: TIMEOUT })
    const listener = jest.fn()
    const stopListening = loading.onDismiss(listener)

    loading.dismiss()
    expect(listener).not.toHaveBeenCalled()

    loading.show({ container, isFullscreen: false })
    loading.show({ container, isFullscreen: false })
    expect(listener).not.toHaveBeenCalled()

    loading.dismiss()
    expect(listener).toHaveBeenCalledTimes(1)

    stopListening()
    loading.show({ container, isFullscreen: false })
    loading.dismiss()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
