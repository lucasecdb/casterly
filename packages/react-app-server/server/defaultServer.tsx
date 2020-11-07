import * as fs from 'fs'
import { IncomingMessage, ServerResponse } from 'http'
import * as path from 'path'
import { parse as parseUrl } from 'url'

import { RootContext } from '@app-server/components'
import fresh from 'fresh'

import {
  BUILD_ID_FILE,
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_RUNTIME_MAIN,
} from '../config/constants'
import * as paths from '../config/paths'
import { RoutesManifest } from '../config/webpack/plugins/routes/utils'
import { MAX_AGE_LONG } from '../utils/maxAge'
import { RoutePromiseComponent, getMatchedRoutes } from '../utils/routes'
import matchRoute from './matchRoute'
import { serveStatic } from './serveStatic'
import {
  interopDefault,
  isPreconditionFailure,
  requestContainsPrecondition,
} from './utils'

const readJSON = (filePath: string) => {
  const file = fs.readFileSync(filePath)
  return JSON.parse(file.toString())
}

export interface ServerOptions {
  dev?: boolean
}

export class DefaultServer {
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

  protected async getBuildId(): Promise<string | undefined> {
    const fileContent = await fs.promises.readFile(
      path.join(paths.appBuildFolder, BUILD_ID_FILE)
    )

    return fileContent.toString()
  }

  protected async handleRequest(req: IncomingMessage, res: ServerResponse) {
    res.statusCode = 200

    let shouldContinue = true

    const matches = [
      matchRoute<{ path: string }>({
        route: '/:path*',
        fn: async (req, res, _, url) => {
          try {
            await serveStatic(
              req,
              res,
              path.join(paths.appPublicBuildFolder, url.pathname!),
              !this.dev
            )
            shouldContinue = false
          } catch (err) {
            if (err.code === 'ENOENT') {
              return
            }

            throw err
          }
        },
      }),
      matchRoute<{ path: string }>({
        route: '/static/:path*',
        fn: async (req, res, _, url) => {
          try {
            await serveStatic(
              req,
              res,
              path.join(paths.appBuildFolder, url.pathname!),
              !this.dev
            )
          } catch {
            res.statusCode = 404
          } finally {
            shouldContinue = false
          }
        },
      }),
      matchRoute({
        route: '/__route-manifest',
        fn: async (req, res, __, url) => {
          const query = url.query as { path?: string }

          const etag = await this.getBuildId()

          res.statusCode = 200
          res.setHeader('content-type', 'application/json')

          if (!this.dev) {
            res.setHeader('etag', etag!)
            res.setHeader('cache-control', 'public, max-age=' + MAX_AGE_LONG)
          }

          if (requestContainsPrecondition(req)) {
            if (isPreconditionFailure(req, { etag })) {
              res.statusCode = 412
              res.end()
              shouldContinue = false
              return
            }

            if (fresh(req.headers, { etag })) {
              res.statusCode = 304
              res.end()
              shouldContinue = false
              return
            }
          }

          if (!query.path) {
            res.statusCode = 400

            res.write(
              JSON.stringify({ message: "Query parameter 'path' is required" })
            )
          } else {
            const url = parseUrl(query.path)

            const {
              routes,
              ...clientContext
            } = await this.getServerContextForRoute(url.pathname!)

            res.write(JSON.stringify(clientContext))
          }

          res.end()

          shouldContinue = false
        },
      }),
    ]

    for (const routeMatch of matches) {
      // eslint-disable-next-line no-await-in-loop
      await routeMatch(req, res)

      if (!shouldContinue) {
        return
      }
    }

    try {
      await this.renderDocument(req, res)
    } catch (err) {
      console.error(err)
      res.statusCode = 500
      res.setHeader('x-robots-tag', 'noindex')
      res.end('error')
    }
  }

  protected getRoutesManifestFile = (): RoutesManifest => this._routesManifest

  private getServerContextForRoute = async (url: string) => {
    const routesManifest = this.getRoutesManifestFile()

    const appRoutesPromises: RoutePromiseComponent[] = await import(
      path.join(paths.appServerBuildFolder, STATIC_ENTRYPOINTS_ROUTES)
    ).then(interopDefault)

    const {
      routes,
      matchedRoutes,
      matchedRoutesAssets,
    } = await getMatchedRoutes({
      location: url,
      routesPromiseComponent: appRoutesPromises,
      routesManifest,
    })

    const serverContext: RootContext = {
      version: await this.getBuildId(),
      routes,
      matchedRoutes: matchedRoutes.map((routeMatch) => ({
        ...routeMatch,
        route: {
          ...routeMatch.route,
          element: undefined,
          component: undefined,
        },
      })),
      matchedRoutesAssets,
      mainAssets: routesManifest.main,
    }

    return serverContext
  }

  private getAppRequestHandler = async (): Promise<
    (
      req: Request,
      status: number,
      headers: Headers,
      context: unknown
    ) => Response
  > => {
    const handleRequest = await import(
      path.join(paths.appServerBuildFolder, STATIC_RUNTIME_MAIN)
    ).then(interopDefault)

    return handleRequest
  }

  private renderDocument = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    const serverContext = await this.getServerContextForRoute(req.url ?? '/')

    const request = new Request(req.url ?? '/', {
      method: req.method,
      headers: Object.entries(res.getHeaders()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    const handleRequest = await this.getAppRequestHandler()

    const response = handleRequest(request, 200, request.headers, serverContext)

    res.statusCode = response.status

    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    Body.writeToStream(res, response)
  }
}
