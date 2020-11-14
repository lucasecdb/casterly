import { RoutesManifest } from '@app-server/cli'
import * as React from 'react'
import { RouteMatch, RouteObject, matchRoutes } from 'react-router'

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
  children?: RouteObjectWithAssets[]
  assets: string[]
  componentName: string | number
  key: number
}

type RouteMatchWithKey = RouteMatch & { route: RouteObjectWithAssets }

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
        key: index,
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

  const matchedRoutes = (matchRoutes(routes, location) ??
    []) as RouteMatchWithKey[]

  const matchedRoutesAssets = Array.from(
    new Set(
      matchedRoutes.flatMap((routeMatched) => {
        return (routeMatched.route as RouteObjectWithAssets).assets
      }) ?? []
    )
  )

  return { routes, matchedRoutes, matchedRoutesAssets }
}
