import { createContext, useContext } from 'react'

export const IdPrefixContext = createContext('map-menu')
export const useIdPrefix = (suffix) => `${useContext(IdPrefixContext)}-${suffix}`
