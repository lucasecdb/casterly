import { RoutesManifest } from 'casterly'
import * as React from 'react'
import { RouteMatch, RouteObject, matchRoutes } from 'react-router'

export type RouteModule = {
  default: React.ComponentType
  headers?: (headersParams: {
    params: RouteMatch['params']
    parentHeaders: Headers
  }) => Record<string, string>
}

export type RoutePromiseComponent = {
  caseSensitive?: boolean
  component: () => Promise<RouteModule>
  path: string
  children?: RoutePromiseComponent[]
  props?: Record<string, unknown>
}

export type RouteObjectWithAssets = RouteObject & {
  children?: RouteObjectWithAssets[]
  assets: string[]
  componentName: string | number
  headers: RouteModule['headers']
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

      const routeComponentModule = await route.component()

      return {
        ...route,
        caseSensitive: route.caseSensitive === true,
        element: React.createElement(routeComponentModule.default, route.props),
        headers: routeComponentModule.headers,
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

  const routeHeaders = matchedRoutes.reduce(
    (headers, matchedRoute) =>
      new Headers(
        matchedRoute.route.headers?.({
          params: matchedRoute.params,
          parentHeaders: headers,
        }) ?? headers
      ),
    new Headers()
  )

  const matchedRoutesAssets = Array.from(
    new Set(
      (
        matchedRoutes.flatMap((routeMatched) => {
          return (routeMatched.route as RouteObjectWithAssets).assets
        }) ?? []
      ).filter((file) => !routesManifest.main.includes(file))
    )
  )

  return { routes, matchedRoutes, matchedRoutesAssets, routeHeaders }
}
