import type { RouteModule } from '@casterly/core'
import React, { createElement, useContext, useMemo } from 'react'
import type { RouteMatch } from 'react-router'

/**
 * NOTE: change this in @casterly/core whenever this changes
 */
export type RouteObject = {
  id: string
  path: string
  file: string
  parentId: string
  index?: boolean
  module: RouteModule
  children?: RouteObject[]
}

export type RouteMatchWithKey = RouteMatch & { route: RouteObject }

export type Asset = { url: string; type: 'js' | 'css' }

export interface RootContext {
  version: string | null
  routes: ClientRoute[]
  matchedRoutes: RouteMatchWithKey[]
  matchedRoutesAssets: Asset[]
  mainAssets: Asset[]
  assetServerUrl: string
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

export interface RootContextProps {
  value: Omit<RootContext, 'routes'> & { routes: RouteObject[] }
}

export const RootContextProvider: React.FC<RootContextProps> = ({
  value,
  children,
}) => {
  const contextValue = useMemo(() => {
    const routes = createClientRoutes(value.routes)

    return {
      ...value,
      routes,
    }
  }, [value])

  return <ctx.Provider value={contextValue}>{children}</ctx.Provider>
}

export type ClientRoute = Omit<
  RouteObject,
  'id' | 'file' | 'parentId' | 'module' | 'children'
> & {
  children?: ClientRoute[]
}

function createClientRoutes(routes: RouteObject[]): ClientRoute[] {
  return routes.map((route) => ({
    path: route.path,
    element: createElement(route.module.default),
    children: createClientRoutes(route.children ?? []),
  }))
}
