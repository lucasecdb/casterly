import path from 'path'

import { Compilation, EntryPlugin, NormalModule, node, sources } from 'webpack'
import type { Compiler, javascript as javascriptTypes } from 'webpack'
// @ts-ignore: no declaration file
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import {
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES_ASSETS,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_RUNTIME_WEBPACK,
} from '../../../constants'
import * as paths from '../../../paths'
import RouteAssetsChildPlugin from './RouteAssetsChildPlugin'
import RouteModuleIdCollectorImportDependencyTemplate from './RouteModuleIdCollectorImportDependencyTemplate'
import {
  RouteAssetComponent,
  evalModuleCode,
  parseRoutesAndAssets,
} from './utils'

const { RawSource } = sources

const JS_FILE_REGEX = /(?<!\.hot-update)\.js$/

const PLUGIN_NAME = 'RoutesManifestPlugin'

export default class RoutesManifestPlugin {
  private routesImports: string[]
  private routeModuleIdMap: Record<string, string | number> = {}

  constructor() {
    this.routesImports = []
  }

  public getNumberOfRoutes() {
    return this.routesImports.length
  }

  public apply(compiler: Compiler) {
    compiler.hooks.make.tapAsync(PLUGIN_NAME, async (compilation, cb) => {
      const childCompiler = compilation.createChildCompiler(
        'routeAssets',
        compiler.options.output,
        []
      )

      childCompiler.context = compiler.context

      new node.NodeTemplatePlugin().apply(childCompiler)
      new node.NodeTargetPlugin().apply(childCompiler)
      new RouteAssetsChildPlugin().apply(childCompiler)
      new EntryPlugin(compiler.context, paths.appRoutesJs, {
        name: STATIC_ENTRYPOINTS_ROUTES_ASSETS,
        filename: STATIC_ENTRYPOINTS_ROUTES_ASSETS + '.js',
        library: {
          type: 'commonjs2',
        },
      }).apply(childCompiler)

      childCompiler.runAsChild((error, _, childCompilation) => {
        if (error) {
          return cb(error)
        }

        if (childCompilation && childCompilation.errors.length > 0) {
          return cb(childCompilation.errors[0])
        }

        cb()
      })
    })

    compiler.hooks.compilation.tap(
      { name: PLUGIN_NAME, stage: Infinity },
      (compilation) => {
        compilation.dependencyTemplates.set(
          ImportDependency,
          new RouteModuleIdCollectorImportDependencyTemplate(
            this.routeModuleIdMap,
            compiler.context
          )
        )
      }
    )

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

            // Create a map of the module name to its assets, to
            // be later used with the routes-assets.js file to
            // gather the chunks for a particular route.
            const routeComponentsAssets = Object.fromEntries(
              Array.from(compilation.chunks.values())
                .flatMap((chunk) => {
                  const referencedChunksFiles = Array.from(
                    chunk.getAllReferencedChunks()
                  )
                    .flatMap((referencedChunk) =>
                      Array.from(referencedChunk.files.values())
                    )
                    .filter((file) => file.indexOf('hot-update') === -1)
                    .map((filePath) =>
                      !filePath.startsWith('/') ? '/' + filePath : filePath
                    )

                  return compilation.chunkGraph
                    .getChunkModules(chunk)
                    .filter((chunkModule) => {
                      const moduleName = (chunkModule as NormalModule)
                        .userRequest

                      return this.routesImports.includes(moduleName)
                    })
                    .map((chunkModule) => {
                      const moduleId = compilation.chunkGraph.getModuleId(
                        chunkModule
                      )

                      return [moduleId, referencedChunksFiles] as const
                    })
                })
                .filter(<T>(value: T | null): value is T => value != null)
            )

            const routeAssetsFilename = STATIC_ENTRYPOINTS_ROUTES_ASSETS + '.js'

            const routes: RouteAssetComponent[] = evalModuleCode(
              compiler.context,
              assets[routeAssetsFilename].source().toString(),
              routeAssetsFilename
            ).default

            const mainAssets = runtimeEntrypointAssets
              .concat(mainEntrypointAssets)
              .concat(hotEntrypointAssets)

            const routesManifest = parseRoutesAndAssets(
              mainAssets,
              routeComponentsAssets,
              routes,
              this.routeModuleIdMap
            )

            assets[ROUTES_MANIFEST_FILE] = new RawSource(
              JSON.stringify(routesManifest, null, 2),
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
            Object.keys(this.routeModuleIdMap).forEach((key) => {
              delete this.routeModuleIdMap[key]
            })
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
