import * as React from 'react'
import { RouteObject, matchRoutes } from 'react-router'

import { RoutesManifest } from '../config/webpack/plugins/routes/utils'
import { interopDefault } from '../server/utils'

export type RoutePromiseComponent = {
  caseSensitive?: boolean
  component: () => Promise<
    React.ComponentType | { default: React.ComponentType }
  >
  path: string
  children?: RoutePromiseComponent[]
}

export type RouteObjectWithAssets = RouteObject & {
  assets: string[]
  componentName: string | number
}

export const mergeRouteAssetsAndRoutes = (
  routesManifestRoutes: RoutesManifest['routes'],
  routePromises: RoutePromiseComponent[]
): Promise<RouteObjectWithAssets[]> => {
  return Promise.all(
    routePromises.map(async (route, index) => {
      const children = route.children
        ? await mergeRouteAssetsAndRoutes(
            routesManifestRoutes[index].children!,
            route.children
          )
        : []

      return {
        ...route,
        caseSensitive: route.caseSensitive === true,
        element: React.createElement(
          await route.component().then(interopDefault)
        ),
        assets: routesManifestRoutes[index].assets ?? [],
        componentName: routesManifestRoutes[index].componentName,
        children,
      }
    })
  )
}

export const getMatchedRoutes = async ({
  location,
  routesPromiseComponent,
  routesManifest,
}: {
  location: string
  routesManifest: RoutesManifest
  routesPromiseComponent: RoutePromiseComponent[]
}) => {
  const routes = await mergeRouteAssetsAndRoutes(
    routesManifest.routes,
    routesPromiseComponent
  )

  const matchedRoutes = matchRoutes(routes, location) ?? []

  const matchedRoutesAssets =
    matchedRoutes.flatMap((routeMatched) => {
      return (routeMatched.route as RouteObjectWithAssets).assets
    }) ?? []

  return { routes, matchedRoutes, matchedRoutesAssets }
}
