// Re-export types for consumers
// This allows: import('@defra/interactive-map').PluginDescriptor
export * from './types.js'

// Export the main class
export { default } from './InteractiveMap/InteractiveMap.js'
export { default as InteractiveMap } from './InteractiveMap/InteractiveMap.js'

// Export events
export { EVENTS } from './config/events.js'
