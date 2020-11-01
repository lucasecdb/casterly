import * as React from 'react'
import { RouteObject, matchRoutes } from 'react-router'

import { interopDefault } from '../server/utils'

export interface RouteAssetsFile {
  main: string[]
  routes: Record<string, string[]>
}

export type RouteAssetComponent = {
  caseSensitive?: boolean
  component: () => string
  path: string
  children?: RouteAssetComponent[]
}

export type RoutePromiseComponent = {
  caseSensitive?: boolean
  component: () => Promise<
    React.ComponentType | { default: React.ComponentType }
  >
  path: string
  children?: RoutePromiseComponent[]
}

export type RouteWithAssets = {
  caseSensitive?: boolean
  assets: string[]
  path: string
  children?: RouteWithAssets[]
}

export type RouteObjectWithAssets = RouteObject & { assets: string[] }

export const createRouteComponentsParser = (
  routeComponentsAssets: Record<string, string[]>
) => {
  const parseRouteComponents = (
    route: RouteAssetComponent
  ): RouteWithAssets => {
    const routeWithComponents: RouteWithAssets = {
      caseSensitive: route.caseSensitive,
      path: route.path,
      assets: routeComponentsAssets[route.component()],
      children: undefined,
    }

    if (routeWithComponents.children) {
      routeWithComponents.children = route.children
        ? route.children.map(parseRouteComponents)
        : undefined
    }

    return routeWithComponents
  }

  return parseRouteComponents
}

export const mergeRouteAssetsAndRoutes = (
  routeAssets: RouteWithAssets[],
  routePromises: RoutePromiseComponent[]
): Promise<RouteObjectWithAssets[]> => {
  return Promise.all(
    routePromises.map(async (route, index) => {
      const children = route.children
        ? await mergeRouteAssetsAndRoutes(
            routeAssets[index].children!,
            route.children
          )
        : []

      return {
        ...route,
        caseSensitive: route.caseSensitive === true,
        element: React.createElement(
          await route.component().then(interopDefault)
        ),
        assets: routeAssets[index].assets,
        children,
      }
    })
  )
}

export const getMatchedRoutes = async ({
  location,
  routesPromiseComponent,
  routesAssetComponent,
  routeAssetMap,
}: {
  location: string
  routeAssetMap: Record<string, string[]>
  routesPromiseComponent: RoutePromiseComponent[]
  routesAssetComponent: RouteAssetComponent[]
}) => {
  const parseRouteComponentsFn = createRouteComponentsParser(routeAssetMap)

  const parsedRoutesWithAssets = routesAssetComponent.map(
    parseRouteComponentsFn
  )

  const routes = await mergeRouteAssetsAndRoutes(
    parsedRoutesWithAssets,
    routesPromiseComponent
  )

  const matchedRoutes = matchRoutes(routes, location)

  const matchedRoutesAssets =
    matchedRoutes?.flatMap((routeMatched) => {
      return (routeMatched.route as RouteObjectWithAssets).assets
    }) ?? []

  return { routes, matchedRoutesAssets }
}
