import * as path from 'path'

import { paths } from '@casterly/utils'
import * as config from '@casterly/utils/lib/userConfig'
import cors from 'cors'
import express from 'express'
import { Headers, Request, Response } from 'node-fetch'
import * as React from 'react'
import { createServer } from 'vite'

import { createViteConfig } from '../config/viteConfig'
import { logStore } from '../output/logger'
import type { ConfigRoute } from '../routes'
import { constructRoutesTree } from '../routes'
import type { RouteModule, RouteObjectWithModuleName } from '../routesServer'
import { getMatchedRoutes } from '../routesServer'

const SECOND = 1
const MINUTE_SECONDS = 60 * SECOND
const HOUR_SECONDS = 60 * MINUTE_SECONDS
const DAY_SECONDS = 24 * HOUR_SECONDS
const YEAR_SECONDS = 365 * DAY_SECONDS

export const MAX_AGE_SHORT = MINUTE_SECONDS
export const MAX_AGE_LONG = YEAR_SECONDS

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

  const { routes, files } = constructRoutesTree(paths.appSrc)

  const serverViteConfig = await createViteConfig({
    dev: true,
    isServer: true,
    routeModules: files.map((file) => path.join(paths.appSrc, file)),
  })

  const vite = await createServer(serverViteConfig)

  async function loadRouteModules(
    routes: ConfigRoute[]
  ): Promise<RouteObjectWithModuleName[]> {
    const routeModules = []

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]

      const moduleName = '/src/' + route.file

      const loadedModule = (await vite.ssrLoadModule(moduleName)) as RouteModule

      let children

      if (route.children) {
        children = await loadRouteModules(route.children)
      }

      routeModules.push({
        path: route.path,
        element: React.createElement(loadedModule.default),
        children,
        key: i,
        module: moduleName,
        routeId: route.id,
      })
    }

    return routeModules
  }

  const moduleRoutes = await loadRouteModules(routes)

  app.use(vite.middlewares)

  const isDev = false

  app.get('/_casterly/route-manifest.json', async (req, res) => {
    const query = req.query

    const buildId = 'development'

    const etag = isDev ? '' : `W/"${buildId}"`

    let status = 200

    const headers: Record<string, string> = {}

    headers['content-type'] = 'application/json'

    if (!isDev) {
      headers['etag'] = etag
      headers['cache-control'] = 'public, max-age=' + MAX_AGE_LONG
    }

    // TODO: precondition

    let body

    if (typeof query.path !== 'string' || query.path.length === 0) {
      status = 400
      body = JSON.stringify({
        message: "Query parameter 'path' is required",
      })
    } else {
      const {
        routes,
        status: contextStatus,
        ...clientContext
      } = await getContext(query.path)

      status = contextStatus
      body = JSON.stringify(clientContext)
    }

    res.status(status)

    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value)
    }

    res.end(body)
  })

  async function getContext(url: string) {
    const matchedRoutesResult = await getMatchedRoutes({
      location: url,
      routes: moduleRoutes,
    })

    const context = {
      status: matchedRoutesResult.status,
      version: null,
      routes: matchedRoutesResult.routes,
      matchedRoutes: matchedRoutesResult.matchedRoutes.map((match) => {
        const { element, children, ...route } = match.route

        return {
          ...match,
          route,
        }
      }),
      // TODO: route assets, JS and CSS
      matchedRoutesAssets: [],
      mainAssets: ['/@vite/client', '/src/app-browser.jsx'],
      devServerPort: 8081,
    }

    return context
  }

  app.use('*', async (req, res) => {
    try {
      const { default: handleRequest } = await vite.ssrLoadModule(
        '/src/app-server.jsx'
      )

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

      const context = await getContext(request.url)

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
