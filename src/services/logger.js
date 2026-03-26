const PREFIX = '[interactive-map]'

export const logger = {
  warn: (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args)
}
