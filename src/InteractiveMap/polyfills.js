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

// Inject polyfill into web workers created from blob URLs (e.g. MapLibre GL)
// Workers have their own global scope so main thread polyfills don't apply
if (needsThrowIfAborted && typeof URL !== 'undefined' && URL.createObjectURL) {
  const _createObjectURL = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (blob) => {
    if (blob instanceof Blob && blob.type === 'text/javascript') {
      const p = 'if(typeof AbortController!=="undefined"){var _p=Object.getPrototypeOf(new AbortController().signal);if(!_p.throwIfAborted){_p.throwIfAborted=function(){if(this.aborted){var e=new Error("The operation was aborted.");e.name="AbortError";throw e}}}}\n'
      blob = new Blob([p, blob], { type: 'text/javascript' })
    }
    return _createObjectURL(blob)
  }
}
