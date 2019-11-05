import { Application } from 'express'
import webpack from 'webpack'
import devMiddleware from 'webpack-dev-middleware'
import hotMiddleware from 'webpack-hot-middleware'

import createWebpackConfig from '../../config/createWebpackConfig'
import { watchCompilers } from '../output/watcher'

export default {
  set: async (app: Application) => {
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

    watchCompilers(clientCompiler, serverCompiler)

    app.use(
      devMiddleware(multiCompiler, {
        // @ts-ignore
        noInfo: true,
        publicPath: clientConfig.output.publicPath,
        writeToDisk: true,
        logLevel: 'silent',
      })
    )

    app.use(hotMiddleware(clientCompiler, { log: false, heartbeat: 2500 }))
  },
}
