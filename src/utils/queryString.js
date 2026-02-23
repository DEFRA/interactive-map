export const getQueryParam = (name, search = window.location?.search) => {
  const urlParams = new URLSearchParams(search)
  return urlParams.get(name)
}
