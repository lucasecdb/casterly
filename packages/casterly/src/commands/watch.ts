import { fileExists } from '@casterly/utils'
import cors from 'cors'
import express from 'express'
import { webpack } from 'webpack'
import whm from 'webpack-hot-middleware'

import { paths } from '..'
import createWebpackConfig from '../config/createWebpackConfig'
import config from '../config/userConfig'
import { logStore } from '../output/logger'
import { watchCompilers } from '../output/watcher'

export default async function startWatch() {
  process.env.NODE_ENV = 'development'

  const webpackConfigFn = config.loadWebpackConfig()

  const app = express()

  app.use(cors())

  let setServerReady: null | (() => void) = null

  const serverReadyPromise = new Promise<void>((resolve) => {
    setServerReady = resolve
  })
  ;(async () => {
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
      whm(clientCompiler, { path: '/_casterly/__webpack-hmr', log: false })
    )

    const useTypescript = await fileExists(paths.appTsConfig)

    watchCompilers(clientCompiler, serverCompiler, useTypescript)

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

    setServerReady!()
  })()

  app.get('/server-ready', (_, res) => {
    serverReadyPromise.then(() => {
      res.send('ok')
    })
  })

  const port =
    config.userConfig.buildServer?.port ?? config.defaultConfig.buildServer.port

  app.listen(port, () => {
    logStore.setState({ port })
  })
}
