import { promises as fsp } from 'fs'
import { join } from 'path'

import type { Manifest } from 'vite'

import type { CasterlyConfig } from './config'
import { getMatchedRoutes } from './routesServer'

const SECOND = 1
const MINUTE_SECONDS = 60 * SECOND
const HOUR_SECONDS = 60 * MINUTE_SECONDS
const DAY_SECONDS = 24 * HOUR_SECONDS
const YEAR_SECONDS = 365 * DAY_SECONDS

export const MAX_AGE_SHORT = MINUTE_SECONDS
export const MAX_AGE_LONG = YEAR_SECONDS

interface CreateRequestHandlerOptions {
  config: CasterlyConfig
  mode: 'development' | 'production'
  moduleRoutes: any
}

export function createRequestHandler(options: CreateRequestHandlerOptions) {
  const { mode, config, moduleRoutes } = options

  return async function handleRequest(request: Request) {
    const url = new URL(request.url)

    const isDev = mode === 'development'

    if (url.pathname === '/_casterly/route-manifest.json') {
      const query = url.searchParams

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

      if (query.has('path') || !query.get('path')) {
        status = 400
        body = JSON.stringify({
          message: "Query parameter 'path' is required",
        })
      } else {
        const path = query.get('path')!

        const {
          routes,
          status: contextStatus,
          ...clientContext
        } = await getContext(path)

        status = contextStatus
        body = JSON.stringify(clientContext)
      }

      const response = new Response(body, {
        status,
        headers,
      })

      return response
    }

    const loadServerManifest = (): Promise<Manifest> =>
      fsp
        .readFile(join(config.appDirectory, 'dist/server/manifest.json'))
        .then((buf) => JSON.parse(buf.toString()))

    try {
      const serverManifest = await loadServerManifest()

      const { default: handleRequest } = await import(
        join(
          config.appDirectory,
          'dist/server',
          serverManifest['src/app-server.jsx'].file
        )
      )

      const responseHeaders = new Headers()

      const context = await getContext(request.url)

      const response = await handleRequest(
        request,
        200,
        responseHeaders,
        context,
        {}
      )

      return response
    } catch (e) {
      console.error(e as any)

      return new Response((e as Error).message, { status: 500 })
    }

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
        matchedRoutesAssets: /*matchedRouteModules.map((module) => ({
        url: module.url,
        type: module.type,
      }))*/ [],
        mainAssets: [
          isDev && { url: '/@vite/client', type: 'js' },
          { url: '/src/app-browser.jsx', type: 'js' },
        ].filter(Boolean),
        devServerPort: 8081,
      }

      return context
    }
  }
}
