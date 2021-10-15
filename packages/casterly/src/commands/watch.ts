import cors from 'cors'
import express from 'express'
import { webpack } from 'webpack'
import whm from 'webpack-hot-middleware'

import createWebpackConfig from '../config/createWebpackConfig'
import config from '../config/userConfig'
import { logStore } from '../output/logger'
import { watchCompilers } from '../output/watcher'

export default async function startWatch() {
  process.env.NODE_ENV = 'development'

  const webpackConfigFn = config.loadWebpackConfig()

  const app = express()

  app.use(cors())

  let setServerReady: () => void

  const serverReadyPromise = new Promise<void>((resolve) => {
    setServerReady = resolve
  })

  async function startWatch() {
    const clientConfig = await createWebpackConfig({
      dev: true,
      isServer: false,
      configFn: webpackConfigFn,
    })

    const serverConfig = await createWebpackConfig({
      dev: true,
      isServer: true,
      configFn: webpackConfigFn,
    })

    const multiCompiler = webpack([clientConfig, serverConfig])

    const [clientCompiler, serverCompiler] = multiCompiler.compilers

    app.use(
      whm(clientCompiler as any, {
        path: '/_casterly/__webpack-hmr',
        log: false,
      })
    )

    watchCompilers(clientCompiler, serverCompiler)

    await new Promise((resolve, reject) => {
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

  app.listen(port, () => {
    logStore.setState({ port })
  })
}
