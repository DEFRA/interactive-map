// The fixture app for the UMD scripts, which expose the package on window.defra
import { startMap } from './app.js'

const { InteractiveMap, datasetsPlugin, drawPlugin } = window.defra

startMap({ InteractiveMap, createDatasetsPlugin: datasetsPlugin, createDrawPlugin: drawPlugin })
