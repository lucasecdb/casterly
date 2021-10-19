import path from 'path'

import { constants, paths } from '@casterly/utils'
import type { RouteWithAssets, RoutesManifest } from 'casterly'
import * as React from 'react'
import type { RouteMatch, RouteObject } from 'react-router'
import { matchRoutes } from 'react-router'

import { Headers } from '../fetch'
import { interopDefault } from '../server/utils'

const { STATIC_RUNTIME_LOADER } = constants

export type RouteModule = {
  default: React.ComponentType<any>
  headers?: (headersParams: {
    params: RouteMatch['params']
    parentHeaders: Headers
  }) => Record<string, string>
  loaderMetadata?: (options: {
    params: RouteMatch['params']
    context: unknown
  }) => unknown
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
  loaderMetadata: RouteModule['loaderMetadata']
  metadata?: unknown
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
    loaderMetadata: routeComponentModule.loaderMetadata,
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
  appContext,
  hasLoaderRuntimeModule,
}: {
  location: string
  routesManifest: RoutesManifest
  routesPromiseComponent: RoutePromiseComponent[]
  notFoundRoutePromiseComponent?: RoutePromiseComponent
  appContext: unknown
  hasLoaderRuntimeModule: boolean
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

  let matchedRoutes = matchRoutes(routes, location) as
    | RouteMatchWithKey[]
    | null

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
    } else {
      matchedRoutes = []
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

  if (!hasLoaderRuntimeModule) {
    return {
      routes,
      matchedRoutes,
      matchedRoutesAssets,
      routeHeaders,
      status,
    }
  }

  const loaderModule = await import(
    path.join(paths.appServerBuildFolder, STATIC_RUNTIME_LOADER)
  ).then(interopDefault)

  const loadFn = loaderModule.createPreloadForContext(appContext)

  let routesToPreload = routes

  for (const matchedRoute of matchedRoutes) {
    const route = routesToPreload.find((route) => route === matchedRoute.route)

    if (!route) {
      break
    }

    const metadata = route.loaderMetadata?.({
      params: matchedRoute.params,
      context: appContext,
    })

    if (!metadata && route.children) {
      routesToPreload = route.children
      continue
    } else if (!metadata && !route.children) {
      break
    }

    const preloadedData = loadFn(metadata)

    route.element = React.cloneElement(route.element as React.ReactElement, {
      ...(route.element as React.ReactElement).props,
      preloadedData,
    })

    route.metadata = metadata

    if (!route.children) {
      break
    }

    routesToPreload = route.children
  }

  return {
    routes,
    matchedRoutes,
    matchedRoutesAssets,
    routeHeaders,
    status,
  }
}
