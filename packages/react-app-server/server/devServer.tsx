import { IncomingMessage, ServerResponse } from 'http'
import * as path from 'path'

import webpack from 'webpack'
import devMiddleware, {
  Options,
  WebpackDevMiddleware,
} from 'webpack-dev-middleware'
import hotClient, { Options as HotClientOptions } from 'webpack-hot-client'
import WebpackHotMiddleware from 'webpack-hot-middleware'

import {
  ASSET_MANIFEST_FILE,
  COMPONENTS_MANIFEST_FILE,
} from '../config/constants'
import createWebpackConfig from '../config/createWebpackConfig'
import * as paths from '../config/paths'
import { watchCompilers } from '../output/watcher'
import fileExists from '../utils/fileExists'
import { AppServer } from './appServer'

type NextFunction = (err?: any) => void
export type NextHandleFunction = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction
) => void

const configureHotClient = (
  compiler: webpack.Compiler,
  options: HotClientOptions
) => {
  return new Promise<hotClient.Client>((resolve) => {
    const client = hotClient(compiler, options)
    const { server } = client

    server.on('listening', () => resolve(client))
  })
}

export class DevServer extends AppServer {
  private serverReady?: Promise<void>
  private setServerReady?: () => void

  private middlewares: NextHandleFunction[] = []
  private hotClient: hotClient.Client | null = null
  private watcher: webpack.MultiWatching | null = null
  private devMiddleware:
    | (WebpackDevMiddleware & NextHandleFunction)
    | null = null

  constructor() {
    super({ dev: true })

    this.initDevServer()
  }

  initDevServer = async () => {
    this.serverReady = new Promise((resolve) => {
      this.setServerReady = resolve
    })

    const clientConfig = await createWebpackConfig({
      dev: true,
      isServer: false,
    })

    const serverConfig = await createWebpackConfig({
      dev: true,
      isServer: true,
    })

    const multiCompiler = webpack([clientConfig, serverConfig])

    const [clientCompiler, serverCompiler] = multiCompiler.compilers

    const useTypescript = await fileExists(paths.appTsConfig)

    watchCompilers(clientCompiler, serverCompiler, useTypescript)

    const devMiddlewareOptions: Options = {
      // @ts-ignore
      noInfo: true,
      publicPath: clientConfig.output!.publicPath!,
      writeToDisk: true,
      logLevel: 'silent',
    }

    this.hotClient = await configureHotClient(clientCompiler, {
      logLevel: 'silent',
      autoConfigure: false,
    })

    this.watcher = await new Promise<webpack.MultiWatching>(
      (resolve, reject) => {
        const watcher = multiCompiler.watch(
          // @ts-ignore
          [clientConfig.watchOptions, serverConfig.watchOptions],
          (err) => {
            if (err) {
              return reject(err)
            }

            resolve(watcher)
          }
        )
      }
    )

    this.devMiddleware = devMiddleware(multiCompiler, devMiddlewareOptions)

    this.middlewares = [WebpackHotMiddleware(clientCompiler)]

    this.setServerReady!()
  }

  protected getAssetManifest = () => {
    return require(path.join(paths.appDist, ASSET_MANIFEST_FILE))
  }

  protected getComponentsManifest = () => {
    return require(path.join(paths.appDistServer, COMPONENTS_MANIFEST_FILE))
  }

  protected async handleRequest(req: IncomingMessage, res: ServerResponse) {
    await this.serverReady

    for (const middleware of this.middlewares) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) {
            return reject(err)
          }

          resolve()
        })
      })
    }

    return super.handleRequest(req, res)
  }
}
