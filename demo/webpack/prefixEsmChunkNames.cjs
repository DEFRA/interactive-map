// Prefixes the chunk names in built dist/esm files with "esm-". The built files use the same
// chunk names as the source (e.g. "im-core"), and webpack merges chunks with the same name
// across entry points, so without this every demo would also download the esm demo's copies.
module.exports = function prefixEsmChunkNames (source) {
  return source.replace(/webpackChunkName:\s*"/g, 'webpackChunkName: "esm-')
}
