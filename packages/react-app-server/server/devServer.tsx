import { IncomingMessage, ServerResponse } from 'http'
import * as path from 'path'

import webpack, { MultiCompiler } from 'webpack'
// @ts-ignore: TODO: typings incompatible with webpack 5
import whm from 'webpack-hot-middleware'

import { ROUTES_MANIFEST_FILE } from '../config/constants'
import createWebpackConfig from '../config/createWebpackConfig'
import * as paths from '../config/paths'
import { watchCompilers } from '../output/watcher'
import fileExists from '../utils/fileExists'
import { DefaultServer } from './defaultServer'

type NextFunction = (err?: any) => void
export type NextHandleFunction = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction
) => void

type MultiWatching = ReturnType<MultiCompiler['watch']>

export class DevServer extends DefaultServer {
  private serverReady?: Promise<void>
  private setServerReady?: () => void

  private middlewares: NextHandleFunction[] = []
  private watcher: MultiWatching | null = null

  constructor() {
    super({ dev: true })

    this.initDevServer()
  }

  initDevServer = async () => {
    this.serverReady = new Promise<void>((resolve) => {
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

    this.watcher = await new Promise<MultiWatching>((resolve, reject) => {
      const watcher = multiCompiler.watch(
        [clientConfig.watchOptions!, serverConfig.watchOptions!],
        (error) => {
          if (error) {
            return reject(error)
          }

          resolve(watcher)
        }
      )
    })

    this.middlewares = [
      whm(clientCompiler, { path: '/__webpack-hmr', log: false }),
    ]

    this.setServerReady!()
  }

  protected getRoutesManifestFile = () => {
    return require(path.join(paths.appBuildFolder, ROUTES_MANIFEST_FILE))
  }

  protected getBuildId() {
    return Promise.resolve(undefined)
  }

  protected async handleRequest(req: IncomingMessage, res: ServerResponse) {
    await this.serverReady

    for (const middleware of this.middlewares) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve, reject) => {
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
