import type { RouteWithAssets, RoutesManifest } from 'casterly'
import * as React from 'react'
import type { RouteMatch, RouteObject } from 'react-router'
import { matchRoutes } from 'react-router'

import { Headers } from '../fetch'

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

const mergeRoute = async ({
  index,
  route,
  manifestRoute,
  children = [],
}: {
  index: number
  route: RoutePromiseComponent
  manifestRoute: RouteWithAssets
  children?: RouteObjectWithAssets[]
}) => {
  const routeComponentModule = await route.component()

  return {
    ...route,
    path: manifestRoute.path,
    caseSensitive: route.caseSensitive === true,
    element: React.createElement(routeComponentModule.default, route.props),
    headers: routeComponentModule.headers,
    assets: manifestRoute.assets ?? [],
    componentName: manifestRoute.componentName,
    children,
    key: index,
  }
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

      return mergeRoute({
        index,
        children,
        route,
        manifestRoute: routesManifestRoutes[index],
      })
    })
  )
}

export const getMatchedRoutes = async ({
  location,
  routesPromiseComponent,
  routesManifest,
  notFoundRoutePromiseComponent,
}: {
  location: string
  routesManifest: RoutesManifest
  routesPromiseComponent: RoutePromiseComponent[]
  notFoundRoutePromiseComponent?: RoutePromiseComponent
}) => {
  const routes = await mergeRouteAssetsAndRoutes(
    routesManifest.routes,
    routesPromiseComponent
  )

  const notFoundRoute =
    notFoundRoutePromiseComponent && routesManifest.notFound
      ? await mergeRoute({
          route: notFoundRoutePromiseComponent,
          manifestRoute: routesManifest.notFound,
          index: -1,
        })
      : undefined

  let status = 200

  let matchedRoutes = matchRoutes(routes, location) as RouteMatchWithKey[]

  if (matchedRoutes == null) {
    status = 404

    if (notFoundRoute) {
      matchedRoutes = [
        {
          params: {},
          pathname: location,
          pathnameBase: '/',
          route: notFoundRoute,
        },
      ]

      routes.push(notFoundRoute)
    }
  }

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

  return {
    routes,
    matchedRoutes,
    matchedRoutesAssets,
    routeHeaders,
    status,
  }
}
