import * as fs from 'fs'
import { IncomingMessage, ServerResponse } from 'http'
import * as path from 'path'
import { parse as parseUrl } from 'url'

import { RootContext } from '@app-server/components'

import {
  ASSET_MANIFEST_FILE,
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_RUNTIME_MAIN,
} from '../config/constants'
import * as paths from '../config/paths'
import { RoutesManifest } from '../config/webpack/plugins/routes/utils'
import { RoutePromiseComponent, getMatchedRoutes } from '../utils/routes'
import matchRoute from './matchRoute'
import { serveStatic } from './serveStatic'
import { interopDefault } from './utils'

const readJSON = (filePath: string) => {
  const file = fs.readFileSync(filePath)
  return JSON.parse(file.toString())
}

export interface ServerOptions {
  dev?: boolean
}

export class AppServer {
  private _assetManifest
  private _routesManifest

  constructor(opts: ServerOptions = {}) {
    const { dev = false } = opts

    if (!dev) {
      this._assetManifest = readJSON(
        path.join(paths.appDist, ASSET_MANIFEST_FILE)
      )
      this._routesManifest = readJSON(
        path.join(paths.appDist, ROUTES_MANIFEST_FILE)
      )
    }
  }

  public getRequestHandler() {
    return this.handleRequest.bind(this)
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
              path.join(paths.appDistPublic, url.pathname!)
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
            await serveStatic(req, res, path.join(paths.appDist, url.pathname!))
          } catch {
            res.statusCode = 404
          } finally {
            shouldContinue = false
          }
        },
      }),
      matchRoute({
        route: '/__route-manifest',
        fn: async (_, res, __, url) => {
          const query = url.query as { path?: string }

          res.statusCode = 200
          res.setHeader('content-type', 'application/json')

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
      res.end('error')
      // await this.renderError(req, res, err)
    }
  }

  protected getRoutesManifestFile = (): RoutesManifest => this._routesManifest

  protected getAssetManifest = () => this._assetManifest

  /*
  private renderError = async (
    _: IncomingMessage,
    res: ServerResponse,
    err: Error
  ) => {
    const errorComponentEntrypoint = this.getComponentsManifest()[
      ERROR_COMPONENT_NAME
    ]

    const assets: string[] = this.getAssetManifest().components[
      ERROR_COMPONENT_NAME
    ]

    const scriptAssets = assets.filter((path) => path.endsWith('.js'))
    const styleAssets = assets.filter((path) => path.endsWith('.css'))

    const props = {
      error: { name: err.name, message: err.message, stack: err.stack },
    }

    const { head, markup } = await renderToHTML(
      await resolveErrorComponent(errorComponentEntrypoint, props)
    )

    res.setHeader('x-robots-tag', 'noindex, nofollow')
    res.setHeader('cache-control', 'no-cache')

    res.statusCode = 500

    res.write('<!doctype html>')

    renderToNodeStream(
      <Document
        markup={markup}
        head={head}
        scripts={scriptAssets}
        styles={styleAssets}
        componentProps={props}
      />
    ).pipe(res)
  }
   */

  private getServerContextForRoute = async (url: string) => {
    const routesManifest = this.getRoutesManifestFile()

    const appRoutesPromises: RoutePromiseComponent[] = await import(
      path.join(paths.appDistServer, STATIC_ENTRYPOINTS_ROUTES)
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

  private renderDocument = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    const serverContext = await this.getServerContextForRoute(req.url ?? '/')

    res.setHeader('Content-Type', 'text/html')

    const request = new Request(req.url ?? '/', {
      method: req.method,
      headers: Object.entries(res.getHeaders()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    const handleRequest: (
      req: Request,
      status: number,
      headers: Headers,
      context: unknown
    ) => Response = await import(
      path.join(paths.appDistServer, STATIC_RUNTIME_MAIN)
    ).then(interopDefault)

    const response = handleRequest(request, 200, request.headers, serverContext)

    res.statusCode = response.status

    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    Body.writeToStream(res, response)
  }
}
