import React, { useContext } from 'react'
import type { RouteMatch, RouteObject } from 'react-router'

export type RouteObjectWithKey = RouteObject & {
  key: number
  children?: RouteObjectWithKey[]
  props?: Record<string, unknown>
  metadata?: unknown
  preloadedData?: unknown
}

export type RouteMatchWithKey = RouteMatch & { route: RouteObjectWithKey }

export interface RootContext {
  version: string | null
  routes: RouteObjectWithKey[]
  matchedRoutes: RouteMatchWithKey[]
  matchedRoutesAssets: string[]
  mainAssets: string[]
  devServerPort?: number
}

const ctx = React.createContext<RootContext | null>(null)

export const useRootContext = () => {
  const value = useContext(ctx)

  if (value == null) {
    throw new Error(
      'You must wrap your app in either <RootServer /> or <RootBrowser />'
    )
  }

  return value
}

export const RootContextProvider: React.FC<{ value: RootContext }> = ({
  value,
  children,
}) => {
  return <ctx.Provider value={value}>{children}</ctx.Provider>
}
