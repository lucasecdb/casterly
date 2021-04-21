import type { Compiler, NormalModule } from 'webpack'

import paths from '../../paths'

const PLUGIN_NAME = 'RouteChunksRegisterPlugin'

const ROUTES_REGISTER_LOADER = require.resolve(
  '../loaders/routes-register-loader'
)

export default class RouteChunksRegisterPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(
      PLUGIN_NAME,
      (_, { normalModuleFactory }) => {
        normalModuleFactory.hooks.module.tap(
          { name: PLUGIN_NAME, stage: Infinity },
          (mod, _, resolveData) => {
            const module = mod as NormalModule
            const issuer = resolveData.contextInfo.issuer

            if (
              issuer === paths.appRoutesJs &&
              module.userRequest.indexOf(paths.appSrc) > -1 &&
              !module.loaders.find(
                (loader) => loader.loader === ROUTES_REGISTER_LOADER
              )
            ) {
              module.loaders.push({
                loader: ROUTES_REGISTER_LOADER,
              } as any)
            }

            return module
          }
        )
      }
    )
  }
}
