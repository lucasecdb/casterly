import * as fs from 'fs'
import * as path from 'path'
import { parse as parseUrl } from 'url'

import { RootContext } from '@casterly/components'
import { constants, paths } from '@casterly/utils'
import type { RoutesManifest } from 'casterly'
import fresh from 'fresh'

import { MAX_AGE_LONG } from '../utils/maxAge'
import { RoutePromiseComponent, getMatchedRoutes } from '../utils/routes'
import matchRoute from './matchRoute'
import { serveStatic } from './serveStatic'
import {
  interopDefault,
  isPreconditionFailure,
  readJSON,
  requestContainsPrecondition,
  requestHeadersToNodeHeaders,
} from './utils'

const {
  BUILD_ID_FILE,
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_RUNTIME_MAIN,
} = constants

interface ServerContext extends RootContext {
  routeHeaders: Headers
}

export interface ServerOptions {
  dev?: boolean
}

global.Request = require('minipass-fetch').Request
global.Response = require('minipass-fetch').Response
global.Headers = require('minipass-fetch').Headers

class DefaultServer {
  private _routesManifest
  private dev

  constructor(opts: ServerOptions = {}) {
    const { dev = false } = opts

    if (!dev) {
      this._routesManifest = readJSON(
        path.join(paths.appBuildFolder, ROUTES_MANIFEST_FILE)
      )
    }

    this.dev = dev
  }

  public getRequestHandler() {
    return this.handleRequest.bind(this)
  }

  protected async getBuildId(): Promise<string | null> {
    const fileContent = await fs.promises.readFile(
      path.join(paths.appBuildFolder, BUILD_ID_FILE)
    )

    return fileContent.toString()
  }

  protected async handleRequest(req: Request, responseHeaders?: Headers) {
    if (
      responseHeaders !== undefined &&
      !(responseHeaders instanceof Headers)
    ) {
      console.warn(
        'handleRequest did not receive a Headers instance for its second argument.'
      )
      responseHeaders = new Headers()
    }

    const matches = [
      matchRoute<{ path: string }>({
        route: '/:path*',
        fn: async (req, _, url) => {
          try {
            return await serveStatic(
              req,
              path.join(paths.appPublicBuildFolder, url.pathname!),
              !this.dev
            )
          } catch (err) {
            if (err.code === 'ENOENT') {
              return
            }

            throw err
          }
        },
      }),
      matchRoute({
        route: '/_casterly/route-manifest',
        fn: async (req, __, url) => {
          const query = url.query as { path?: string }

          const buildId = await this.getBuildId()

          const etag = `W/"${buildId}"`

          let status = 200

          const headers = new Headers()

          headers.set('content-type', 'application/json')

          if (!this.dev) {
            headers.set('etag', etag)
            headers.set('cache-control', 'public, max-age=' + MAX_AGE_LONG)
          }

          if (requestContainsPrecondition(req)) {
            if (isPreconditionFailure(req, new Headers({ etag }))) {
              return new Response(null, {
                status: 412,
                headers,
              })
            }

            if (
              fresh(requestHeadersToNodeHeaders(req.headers), {
                etag,
              })
            ) {
              return new Response(null, {
                status: 304,
                headers,
              })
            }
          }

          let body

          if (!query.path) {
            status = 400

            body = JSON.stringify({
              message: "Query parameter 'path' is required",
            })
          } else {
            const url = parseUrl(query.path)

            const {
              routes,
              routeHeaders,
              ...clientContext
            } = await this.getServerContextForRoute(url.pathname!)

            body = JSON.stringify(clientContext)
          }

          return new Response(body, {
            status,
            headers,
          })
        },
      }),
      matchRoute<{ filePath: string }>({
        route: '/_casterly/static/:filePath*',
        fn: async (req, { filePath }) => {
          try {
            return await serveStatic(
              req,
              path.join(paths.appBuildFolder, 'static', ...filePath),
              !this.dev
            )
          } catch {
            return new Response(null, { status: 404 })
          }
        },
      }),
      matchRoute<{ filePath: string }>({
        route: '/_casterly/:path*',
        fn: async () => {
          return new Response(null, { status: 404 })
        },
      }),
    ]

    for (const routeMatch of matches) {
      // eslint-disable-next-line no-await-in-loop
      const response = await routeMatch(req)

      if (response) {
        return response
      }
    }

    try {
      return await this.renderDocument(req, responseHeaders)
    } catch (err) {
      console.error('[ERROR]:', err)
      return new Response('error', {
        status: 500,
        headers: {
          'x-robots-tag': 'noindex, nofollow',
        },
      })
    }
  }

  protected getRoutesManifestFile = (): RoutesManifest => this._routesManifest

  protected getDevServerPort(): undefined | number {
    return undefined
  }

  private getServerContextForRoute = async (url: string) => {
    const routesManifest = this.getRoutesManifestFile()

    const appRoutesPromises: RoutePromiseComponent[] = await import(
      path.join(paths.appServerBuildFolder, STATIC_ENTRYPOINTS_ROUTES)
    ).then(interopDefault)

    const {
      routes,
      matchedRoutes,
      matchedRoutesAssets,
      routeHeaders,
    } = await getMatchedRoutes({
      location: url,
      routesPromiseComponent: appRoutesPromises,
      routesManifest,
    })

    const serverContext: ServerContext = {
      version: await this.getBuildId(),
      devServerPort: this.getDevServerPort(),
      routes,
      matchedRoutes: matchedRoutes.map((routeMatch) => {
        const {
          element,
          // @ts-ignore: the component prop is injected by the
          // webpack plugin via routes-manifest.json
          component,
          children,
          ...route
        } = routeMatch.route

        return {
          ...routeMatch,
          route: {
            ...route,
            element: null,
          },
        }
      }),
      matchedRoutesAssets,
      mainAssets: routesManifest.main,
      routeHeaders,
    }

    return serverContext
  }

  private getAppRequestHandler = async (): Promise<
    (
      req: Request,
      status: number,
      headers: Headers,
      context: unknown
    ) => Response | Promise<Response>
  > => {
    const handleRequest = await import(
      path.join(paths.appServerBuildFolder, STATIC_RUNTIME_MAIN)
    ).then(interopDefault)

    return handleRequest
  }

  private renderDocument = async (
    request: Request,
    responseHeaders?: Headers
  ) => {
    const headers = new Headers(responseHeaders)

    const serverContext = await this.getServerContextForRoute(request.url)

    serverContext.routeHeaders?.forEach((value, key) => {
      headers.set(key, value)
    })

    global.fetch = require('make-fetch-happen')

    const handleRequest = await this.getAppRequestHandler()

    let response = handleRequest(request, 200, headers, serverContext)

    if ('then' in response) {
      response = await response
    }

    return response
  }
}

export { DefaultServer as _private_DefaultServer }

export const createRequestHandler = () => {
  const serverInstance = new DefaultServer()

  return serverInstance.getRequestHandler()
}
