import type { RouteMatch, RouteObject } from 'react-router'
import { matchRoutes } from 'react-router'

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

type RoutePromiseComponent = {
  caseSensitive?: boolean
  component: () => Promise<RouteModule>
  path: string
  children?: RoutePromiseComponent[]
  props?: Record<string, unknown>
}

export type RouteObjectWithModuleName = RouteObject & {
  children?: RouteObjectWithModuleName[]
  module: string
  key: number
  routeId: string
}

type RouteMatchWithKey = RouteMatch & { route: RouteObjectWithModuleName }

export async function getMatchedRoutes({
  location,
  // routesManifest,
  // notFoundRoutePromiseComponent,
  routes,
}: {
  location: string
  routes: RouteObjectWithModuleName[]
  notFoundRoutePromiseComponent?: RoutePromiseComponent
}) {
  /*
  const routes = await mergeRouteAssetsAndRoutes(
    // routesManifest.routes,
    routesPromiseComponent
  )
  */

  /*
  const notFoundRoute =
    notFoundRoutePromiseComponent && routesManifest.notFound
      ? await mergeRoute({
          route: notFoundRoutePromiseComponent,
          // manifestRoute: routesManifest.notFound,
          index: -1,
        })
      : undefined
  */

  let status = 200

  let matchedRoutes = matchRoutes(routes, location) as
    | RouteMatchWithKey[]
    | null

  if (matchedRoutes == null) {
    status = 404

    /*
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
    */
    matchedRoutes = []
    // }
  }

  /*
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
  */

  /*
  const matchedRoutesAssets = Array.from(
    new Set(
      (
        matchedRoutes.flatMap((routeMatched) => {
          return (routeMatched.route as RouteObjectWithAssets).assets
        }) ?? []
      ).filter((file) => !routesManifest.main.includes(file))
    )
  )
  */

  return {
    routes,
    matchedRoutes,
    // matchedRoutesAssets,
    // routeHeaders,
    status,
  }
}
