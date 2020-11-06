import React, { useContext } from 'react'
import { RouteMatch, RouteObject } from 'react-router'

export interface RootContext {
  version?: string
  routes: RouteObject[]
  matchedRoutes: RouteMatch[]
  matchedRoutesAssets: string[]
  mainAssets: string[]
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
