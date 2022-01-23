import { basename, join, relative } from 'path'

import { paths } from '@casterly/utils'
import * as config from '@casterly/utils/lib/userConfig'
import cors from 'cors'
import express from 'express'
import glob from 'fast-glob'
import { Headers, Request, Response } from 'node-fetch'
import * as React from 'react'
import { matchRoutes } from 'react-router'
import type { RouteMatch, RouteObject } from 'react-router'
import { createServer } from 'vite'

import { createViteConfig } from '../config/viteConfig'
import { logStore } from '../output/logger'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      Headers: typeof Headers
      Request: typeof Request
      Response: typeof Response
      fetch: typeof fetch
    }
  }
}

function installGlobals() {
  const anyGlobal = global as any

  anyGlobal.Request = Request
  anyGlobal.Response = Response
  anyGlobal.Headers = Headers
}

installGlobals()

export default async function startWatch() {
  process.env.NODE_ENV = 'development'

  const app = express()

  app.use(cors())

  let setServerReady: () => void

  const serverReadyPromise = new Promise<void>((resolve) => {
    setServerReady = resolve
  })

  async function startWatch() {
    setServerReady()
  }

  startWatch()

  app.get('/server-ready', (_, res) => {
    serverReadyPromise.then(() => {
      res.send('ok')
    })
  })

  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : undefined ??
      config.userConfig.buildServer?.port ??
      config.defaultConfig.buildServer.port

  const routeModules = await glob('src/routes/**/*.{jsx,tsx}', {
    cwd: paths.appDirectory,
  })

  const serverViteConfig = await createViteConfig({
    dev: true,
    isServer: true,
    routeModules,
  })

  const vite = await createServer(serverViteConfig)

  // const routes = await vite.ssrLoadModule('/src/routes.js')

  // const routesModule = await vite.moduleGraph.getModuleByUrl('/src/routes.js')
  // console.log(routesModule)

  const routes: RouteObjectWithModuleName[] = []

  for (const routeModulePath of routeModules) {
    let routePath = relative('src/routes', routeModulePath).replace(
      /\.[jt]sx$/,
      ''
    )

    if (routePath === 'index') {
      routePath = '/'
    } else {
      routePath = '/' + routePath
    }

    const loadedModule = (await vite.ssrLoadModule(
      '/' + routeModulePath
    )) as RouteModule

    routes.push({
      path: routePath,
      element: React.createElement(loadedModule.default),
      moduleName: routeModulePath,
    })
  }

  console.log({ routes })

  app.use(vite.middlewares)

  app.use('*', async (req, res) => {
    try {
      const { default: handleRequest } = await vite.ssrLoadModule(
        '/src/app-server.jsx'
      )

      // console.log(vite.moduleGraph.fileToModulesMap)

      /*
      vite.moduleGraph
        .getModulesByFile(
          '/home/lucas/sources/casterly/test/integration/development/src/css.jsx'
        )
        ?.forEach((module) => {
          console.log(module)
        })
      */

      const request = new Request(req.originalUrl, {
        method: req.method,
        headers: Object.entries(req.headers).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : value?.toString(),
        ]) as Array<[string, string]>,
      })

      const responseHeaders = new Headers(
        Object.entries(res.getHeaders()).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : value?.toString(),
        ]) as Array<[string, string]>
      )

      // const routes = { default: [] }

      const matchedRoutesResult = await getMatchedRoutes({
        location: request.url,
        routes,
      })

      const context = {
        version: null,
        routes: matchedRoutesResult.routes,
        matchedRoutes: matchedRoutesResult.matchedRoutes,
        // TODO: route assets, JS and CSS
        matchedRoutesAssets: [],
        mainAssets: ['/@vite/client', '/src/app-browser.jsx'],
        devServerPort: 8081,
      }

      const response = await handleRequest(
        request,
        200,
        responseHeaders,
        context,
        {}
      )

      const body = response.body.toString()

      res.end(body)
    } catch (e) {
      vite.ssrFixStacktrace(e as Error)
      console.error(e as any)

      res.status(500).send((e as Error).message)
    }
  })

  app.listen(port, () => {
    logStore.setState({ port })
  })
}

type RouteModule = {
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

type RouteObjectWithModuleName = RouteObject & {
  moduleName: string
}

type RouteObjectWithAssets = RouteObject & {
  children?: RouteObjectWithAssets[]
  // assets: string[]
  // componentName: string | number
  headers: RouteModule['headers']
  loaderMetadata: RouteModule['loaderMetadata']
  metadata?: unknown
  key: number
}

type RouteMatchWithKey = RouteMatch & { route: RouteObjectWithAssets }

async function mergeRoute({
  index,
  route,
  // manifestRoute,
  children = [],
}: {
  index: number
  route: RoutePromiseComponent
  // manifestRoute: any
  children?: RouteObjectWithAssets[]
}) {
  const routeComponentModule = await route.component()

  return {
    ...route,
    path: route.path,
    caseSensitive: route.caseSensitive === true,
    element: React.createElement(routeComponentModule.default, route.props),
    headers: routeComponentModule.headers,
    loaderMetadata: routeComponentModule.loaderMetadata,
    // assets: manifestRoute.assets ?? [],
    // componentName: manifestRoute.componentName,
    children,
    key: index,
  }
}

function mergeRouteAssetsAndRoutes(
  // routesManifestRoutes: any,
  routePromises: RoutePromiseComponent[]
): Promise<RouteObjectWithAssets[]> {
  return Promise.all(
    routePromises.map(async (route, index) => {
      const children = route.children
        ? await mergeRouteAssetsAndRoutes(
            // routesManifestRoutes[index].children!,
            route.children
          )
        : []

      return mergeRoute({
        index,
        children,
        route,
        // manifestRoute: routesManifestRoutes[index],
      })
    })
  )
}

async function getMatchedRoutes({
  location,
  // routesManifest,
  // notFoundRoutePromiseComponent,
  routes,
}: {
  location: string
  // routesManifest: any
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
    routeHeaders,
    status,
  }
}
