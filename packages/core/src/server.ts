import type React from 'react'
import type { RouteObject } from 'react-router'
import { matchRoutes } from 'react-router'

import { Headers } from './fetch'
import type { Request } from './fetch'

interface ServerEntryModule {
  default: (
    request: Request,
    status: number,
    responseHeaders: Headers,
    context: unknown,
    appContext: unknown
  ) => Response | Promise<Response>
}

export interface RouteModule {
  default: React.ComponentType
}

/**
 * NOTE: change this in @casterly/components whenever this changes
 */
interface ServerRoute {
  id: string
  path: string
  file: string
  parentId: string
  index?: boolean
  module: RouteModule
  children?: ServerRoute[]
}

export interface ServerBuild {
  server: ServerEntryModule
  routes: Record<string, Omit<ServerRoute, 'children'>>
  manifest: Record<string, { file: string; src: string; css?: string[] }>
  assetServerUrl: string
}

export type BuildMode = 'development' | 'production'

const SECOND = 1
const MINUTE_SECONDS = 60 * SECOND
const HOUR_SECONDS = 60 * MINUTE_SECONDS
const DAY_SECONDS = 24 * HOUR_SECONDS
const YEAR_SECONDS = 365 * DAY_SECONDS

// const MAX_AGE_SHORT = MINUTE_SECONDS
const MAX_AGE_LONG = YEAR_SECONDS

export function createRequestHandler({
  server,
  mode,
}: {
  server: ServerBuild
  mode: BuildMode
}) {
  const { assetServerUrl } = server

  const serverRoutes = createServerRoutes(server.routes)

  return async (request: Request): Promise<Response> => {
    const isDev = mode === 'development'
    const url = new URL(request.url)

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

      if (!query.has('path') || !query.get('path')) {
        status = 400
        body = JSON.stringify({
          message: "Query parameter 'path' is required",
        })
      } else {
        const path = query.get('path')!

        const {
          status: contextStatus,
          context: { routes, ...clientContext },
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

    try {
      const responseHeaders = new Headers()

      const { status, context } = await getContext(url.pathname)

      const response = await server.server.default(
        request,
        status,
        responseHeaders,
        context,
        {}
      )

      return response
    } catch (e) {
      console.error(e as any)

      return new Response((e as Error).message, { status: 500 })
    }

    async function getContext(pathname: string) {
      const matchedRoutesResult = await getMatchedRoutes({
        location: pathname,
        routes: serverRoutes,
      })

      const context = {
        version: null,
        routes: serverRoutes,
        matchedRoutes: matchedRoutesResult.matchedRoutes.map((match) => {
          const { children, module, ...route } = match.route

          return {
            ...match,
            route: {
              ...route,
              file: server.manifest[match.route.file].file,
            },
          }
        }),
        matchedRoutesAssets: matchedRoutesResult.matchedRoutes.reduce<
          Array<{
            url: string
            type: string
          }>
        >(
          (assets, match) => [
            ...assets,
            {
              url: '/' + server.manifest[match.route.file].file,
              type: 'js',
            },
            ...(server.manifest[match.route.file].css?.map((fileName) => ({
              url: '/' + fileName,
              type: 'css',
            })) ?? []),
          ],
          []
        ),
        mainAssets: [
          // TODO: decouple build system from server runtime
          isDev && { url: '/@vite/client', type: 'js' },
          {
            url: '/' + server.manifest['src/app-browser.jsx'].file,
            type: 'js',
          },
        ].filter(Boolean),
        assetServerUrl: '',
      }

      return { context, status: matchedRoutesResult.status }
    }
  }
}

async function getMatchedRoutes({
  location,
  routes,
}: {
  location: string
  routes: RouteObject[]
}) {
  let status = 200

  let matchedRoutes = matchRoutes(routes, location)

  if (matchedRoutes == null) {
    status = 404

    // TODO: create entrypoint for not found route and serve if it exists at
    // this point

    matchedRoutes = []
  }

  // TODO: should add support for headers

  // TODO: should add support for pre-fetching data

  return {
    status,
    matchedRoutes: matchedRoutes.map((match) => ({
      pathname: match.pathname,
      pathnameBase: match.pathnameBase,
      params: match.params,
      route: match.route as unknown as ServerRoute,
    })),
  }
}

function createServerRoutes(
  routes: Record<string, Omit<ServerRoute, 'children'>>,
  parentId?: string
): ServerRoute[] {
  return Object.keys(routes)
    .filter((id) => routes[id].parentId === parentId)
    .map((id) => ({ ...routes[id], children: createServerRoutes(routes, id) }))
}

function requestContainsPrecondition(req: Request) {
  const { headers } = req

  return (
    !!headers.get('if-match') ||
    !!headers.get('if-none-match') ||
    !!headers.get('if-modified-since') ||
    !!headers.get('if-unmodified-since')
  )
}

function isPreconditionFailure(req: Request, headers: Headers) {
  const { headers: requestHeaders } = req

  const match = requestHeaders.get('if-match')

  if (match) {
    const etag = headers.get('etag')
    return (
      !etag ||
      (match !== '*' &&
        parseTokenList(match).every(
          (match) =>
            match !== etag && match !== 'W/' + etag && 'W/' + match !== etag
        ))
    )
  }

  return false
}

function parseTokenList(str: string) {
  let end = 0
  const list = []
  let start = 0

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c /* , */:
        list.push(str.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(str.substring(start, end))

  return list
}
