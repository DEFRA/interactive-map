// /plugins/map-loading/index.js
import './mapLoading.scss'
import { createLoadingOverlay } from './overlay.js'

export default function createPlugin ({ manifest, ...options } = {}) {
  const controller = createLoadingOverlay(options)

  return {
    id: 'mapLoading',
    ...options,
    manifest,
    controller,
    load: async () => {
      const module = (await import(/* webpackChunkName: "im-map-loading-plugin" */ './manifest.js')).manifest
      return module
    },
    show: controller.show,
    dismiss: controller.dismiss,
    isShown: controller.isShown,
    destroy: controller.destroy
  }
}
