import Application from 'koa'
import webpack from 'webpack'
import koaWebpack, { Options } from 'koa-webpack'
import hotClient, { Options as HotClientOptions } from 'webpack-hot-client'

import createWebpackConfig from '../../config/createWebpackConfig'
import { watchCompilers } from '../../output/watcher'
import * as paths from '../../config/paths'
import fileExists from '../../utils/fileExists'

const configureHotClient = (
  compiler: webpack.Compiler,
  options: HotClientOptions
) => {
  return new Promise((resolve) => {
    const client = hotClient(compiler, options)
    // @ts-ignore
    const { server } = client

    server.on('listening', () => resolve(client))
  })
}

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

    const useTypescript = await fileExists(paths.appTsConfig)

    watchCompilers(clientCompiler, serverCompiler, useTypescript)

    const devMiddleware: Options['devMiddleware'] = {
      // @ts-ignore
      noInfo: true,
      publicPath: clientConfig.output!.publicPath!,
      writeToDisk: true,
      logLevel: 'silent',
    }

    await configureHotClient(clientCompiler, {
      logLevel: 'silent',
      autoConfigure: false,
    })

    app.use(
      await koaWebpack({
        compiler: clientCompiler,
        devMiddleware,
        hotClient: false,
      })
    )

    app.use(
      await koaWebpack({
        compiler: serverCompiler,
        devMiddleware,
        hotClient: false,
      })
    )
  },
}
