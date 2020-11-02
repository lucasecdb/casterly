import path from 'path'

import { Compilation, EntryPlugin, NormalModule, sources } from 'webpack'
import type { Compiler, javascript as javascriptTypes } from 'webpack'
// @ts-ignore
import NodeTargetPlugin from 'webpack/lib/node/NodeTargetPlugin'
// @ts-ignore
import NodeTemplatePlugin from 'webpack/lib/node/NodeTemplatePlugin'

import { RouteAssetsFile } from '../../../utils/routes'
import {
  ROUTE_ASSETS_FILE,
  STATIC_ENTRYPOINTS_ROUTES_MANIFEST,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_RUNTIME_WEBPACK,
} from '../../constants'
import * as paths from '../../paths'
import RouteManifestChildPlugin from './RouteManifestChildPlugin'

const { RawSource } = sources

const JS_FILE_REGEX = /(?<!\.hot-update)\.js$/

const PLUGIN_NAME = 'RouteManifestPlugin'

export default class RouteManifestPlugin {
  private routesImports: string[]

  constructor() {
    this.routesImports = []
  }

  apply(compiler: Compiler) {
    compiler.hooks.make.tapAsync(PLUGIN_NAME, async (compilation, cb) => {
      const childCompiler = compilation.createChildCompiler(
        'routeManifest',
        compiler.options.output,
        []
      )

      childCompiler.context = compiler.context

      new NodeTargetPlugin().apply(childCompiler)
      new NodeTemplatePlugin().apply(childCompiler)
      new RouteManifestChildPlugin().apply(childCompiler)
      new EntryPlugin(compiler.context, paths.appRoutesJs, {
        name: STATIC_ENTRYPOINTS_ROUTES_MANIFEST,
      }).apply(childCompiler)

      childCompiler.runAsChild((error) => {
        cb(error)
      })
    })

    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation, { normalModuleFactory }) => {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          (assets) => {
            const getNamedEntrypointAssets = (name: string) =>
              Array.from(compilation.namedChunks.get(name)?.files ?? [])
                .filter((file) => JS_FILE_REGEX.test(file))
                .map((file) => '/' + file)

            const runtimeEntrypointAssets = getNamedEntrypointAssets(
              STATIC_RUNTIME_WEBPACK
            )
            const mainEntrypointAssets = getNamedEntrypointAssets(
              STATIC_RUNTIME_MAIN
            )
            const hotEntrypointAssets = getNamedEntrypointAssets(
              STATIC_RUNTIME_HOT
            )

            // Create a map of the module name to it's assets, to
            // be later used with the routes-manifest.js file to
            // gather the chunks for a particular route.
            const routeComponentsAssets = Object.fromEntries(
              Array.from(compilation.chunks.values())
                .map((chunk) => {
                  let routeComponentModule: string | null = null

                  const isChunkForRouteComponent = compilation.chunkGraph
                    .getChunkModules(chunk)
                    .some((chunkModule) => {
                      const moduleName = (chunkModule as NormalModule)
                        .userRequest

                      if (this.routesImports.includes(moduleName)) {
                        routeComponentModule =
                          '.' +
                          path.sep +
                          path.relative(compiler.context, moduleName)
                        return true
                      }

                      return false
                    })

                  if (!isChunkForRouteComponent) {
                    return null
                  }

                  return [
                    routeComponentModule!,
                    Array.from(chunk.files.values()).map((filePath) =>
                      !filePath.startsWith('/') ? '/' + filePath : filePath
                    ),
                  ] as const
                })
                .filter(<T>(value: T | null): value is T => value != null)
            )

            const routeAssets: RouteAssetsFile = {
              main: runtimeEntrypointAssets
                .concat(mainEntrypointAssets)
                .concat(hotEntrypointAssets),
              routes: routeComponentsAssets,
            }

            assets[ROUTE_ASSETS_FILE] = new RawSource(
              JSON.stringify(routeAssets, null, 2),
              true
            )
          }
        )

        // Hook to clear the routeImports array when the routes
        // file is built (either on first compilation or on rebuilds).
        compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
          const normalModule = module as NormalModule

          const resource = normalModule.resource

          if (resource === paths.appRoutesJs) {
            this.routesImports = []
          }
        })

        // Collect the path for the dynamic import statements inside
        // the routes file.
        const importParserHandler = (
          parser: javascriptTypes.JavascriptParser
        ) => {
          parser.hooks.importCall.tap(PLUGIN_NAME, (expr) => {
            const parserModule = parser.state.current as NormalModule
            const module = compilation.getModule(parserModule)

            const resource = (module as NormalModule).resource

            if (resource !== paths.appRoutesJs) {
              return
            }

            if (expr.type !== 'ImportExpression') {
              return
            }

            const param = parser.evaluateExpression(expr.source)

            if (
              !param.isString() ||
              param.expression.type !== 'Literal' ||
              typeof param.expression.value !== 'string'
            ) {
              throw new Error(
                'Imports inside the routes file must be a plain string'
              )
            }

            this.routesImports.push(
              paths.resolveModule(
                (relativePath) => path.resolve(module.context, relativePath),
                param.expression.value
              )
            )
          })
        }

        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap(PLUGIN_NAME, importParserHandler)
        normalModuleFactory.hooks.parser
          .for('javascript/dynamic')
          .tap(PLUGIN_NAME, importParserHandler)
        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap(PLUGIN_NAME, importParserHandler)
      }
    )
  }
}
