// crypto.randomUUID
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  let last = 0
  crypto.randomUUID = () => {
    last = Math.max(Date.now(), last + 1)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c, i) => {
      const v = i < 12 ? Number.parseInt(last.toString(16).padStart(12, '0')[i], 16) : Math.random() * 16 | 0 // NOSONAR
      return (c === 'x' ? v : (v & 0x3 | 0x8)).toString(16)
    })
  }
}

// Object.hasOwn — capture before polyfilling so the worker injection condition below is correct
const needsHasOwn = !Object.hasOwn
if (needsHasOwn) {
  Object.hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key) // NOSONAR
}

// AbortSignal.throwIfAborted
const needsThrowIfAborted = typeof AbortController !== 'undefined' &&
  !Object.getPrototypeOf(new AbortController().signal).throwIfAborted

if (needsThrowIfAborted) {
  const signalProto = Object.getPrototypeOf(new AbortController().signal)
  signalProto.throwIfAborted = function () {
    if (this.aborted) {
      const err = new Error('The operation was aborted.')
      err.name = 'AbortError'
      throw err
    }
  }
}

// Inject polyfills into web workers — workers have their own global scope so
// main thread polyfills don't apply. Two cases:
//   1. Blob URL workers (MapLibre default): intercept URL.createObjectURL
//   2. String URL workers (MapLibre workerUrl, used in CSP environments): intercept Worker constructor
const needsWorkerPolyfills = (needsThrowIfAborted || needsHasOwn) && typeof URL !== 'undefined' && URL.createObjectURL

if (needsWorkerPolyfills) {
  const JS_MIME = 'text/javascript'
  const workerPolyfillCode = [
    'if(!Object.hasOwn){Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k)}}\n',
    needsThrowIfAborted ? 'if(typeof AbortController!=="undefined"){var _p=Object.getPrototypeOf(new AbortController().signal);if(!_p.throwIfAborted){_p.throwIfAborted=function(){if(this.aborted){var e=new Error("The operation was aborted.");e.name="AbortError";throw e}}}}\n' : ''
  ].join('')

  // Save original before overriding, so the Worker override below can use it directly
  // and avoid double-injecting the polyfill code
  const _createObjectURL = URL.createObjectURL.bind(URL)

  URL.createObjectURL = (blob) => {
    if (blob instanceof Blob && blob.type === JS_MIME) {
      blob = new Blob([workerPolyfillCode, blob], { type: JS_MIME })
    }
    return _createObjectURL(blob)
  }

  if (typeof Worker !== 'undefined') {
    const NativeWorker = Worker
    // eslint-disable-next-line no-global-assign
    Worker = function (url, options) {
      if (typeof url === 'string' && !url.startsWith('blob:')) {
        const blob = new Blob([`${workerPolyfillCode}importScripts(${JSON.stringify(url)})`], { type: JS_MIME })
        url = _createObjectURL(blob)
      }
      return new NativeWorker(url, options)
    }
    Worker.prototype = NativeWorker.prototype
  }
}
