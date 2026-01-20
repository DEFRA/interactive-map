export const getQueryParam = (name, search = globalThis.location?.search) => {
  const urlParams = new URLSearchParams(search)
  return urlParams.get(name)
}
