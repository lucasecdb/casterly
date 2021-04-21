import { Compilation, EntryPlugin, node, sources } from 'webpack'
import type { Compiler, NormalModule } from 'webpack'
// @ts-ignore: no declaration file
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import {
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES_ASSETS,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
} from '../../../constants'
import paths from '../../../paths'
import RouteAssetsChildPlugin from './RouteAssetsChildPlugin'
import RouteModuleIdCollectorImportDependencyTemplate from './RouteModuleIdCollectorImportDependencyTemplate'
import type { RouteAssetComponent } from './utils'
import { evalModuleCode, parseRoutesAndAssets } from './utils'

const { RawSource } = sources

const PLUGIN_NAME = 'RoutesManifestPlugin'

const routeAssetsFilename = STATIC_ENTRYPOINTS_ROUTES_ASSETS + '.js'

const countNumberOfRoutes = (routes: RouteAssetComponent[]): number => {
  return routes.reduce((total, route) => {
    const childrenCount = route.children
      ? countNumberOfRoutes(route.children)
      : 0

    return total + 1 + childrenCount
  }, 0)
}

export const CHILD_COMPILER_NAME = 'routeAssets'

export class RoutesManifestPlugin {
  private routeModuleIdMap: Map<string, string | number> = new Map()

  private getRoutesFromCompilation = (
    compiler: Compiler,
    assets: Compilation['assets']
  ) => {
    const routes: RouteAssetComponent[] = evalModuleCode(
      compiler.context,
      assets[routeAssetsFilename].source().toString(),
      routeAssetsFilename
    ).default

    return routes
  }

  public getNumberOfRoutes = () => 0

  public apply(compiler: Compiler) {
    compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, cb) => {
      const childCompiler = compilation.createChildCompiler(
        CHILD_COMPILER_NAME,
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

        childCompiler.close(cb)
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

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.getNumberOfRoutes = () => {
        const routes = this.getRoutesFromCompilation(
          compiler,
          compilation.assets
        )

        return countNumberOfRoutes(routes)
      }

      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          const stats = compilation
            .getStats()
            .toJson({ all: false, entrypoints: true })

          const getNamedEntrypointAssets = (name: string) =>
            ((stats.entrypoints?.[name]?.assets ?? []) as { name: string }[])
              .map((asset) => asset.name)
              .filter((file) => file.indexOf('hot-update') === -1)
              .map((filePath) =>
                !filePath.startsWith('/') ? '/' + filePath : filePath
              )

          const mainEntrypointAssets = getNamedEntrypointAssets(
            STATIC_RUNTIME_MAIN
          )
          const hotEntrypointAssets = getNamedEntrypointAssets(
            STATIC_RUNTIME_HOT
          )

          const mainAssets = mainEntrypointAssets.concat(
            hotEntrypointAssets.filter(
              (file) => !mainEntrypointAssets.includes(file)
            )
          )

          const compilationModules = Array.from(compilation.modules.values())

          // Create a map of the module name to its assets, to
          // be later used with the routes-assets.js file to
          // gather the chunks for a particular route.
          const routeComponentsAssets = Object.fromEntries(
            Array.from(this.routeModuleIdMap.values())
              .map((moduleId) => {
                const routeModule = compilationModules.find(
                  (module) =>
                    compilation.chunkGraph?.getModuleId(module) === moduleId
                )

                if (!routeModule) {
                  return null
                }

                const routeFiles = compilation.chunkGraph
                  ?.getModuleChunks(routeModule)
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
                      .filter((file) => !mainAssets.includes(file))

                    return referencedChunksFiles
                  })

                return [moduleId, routeFiles]
              })
              .filter(<T>(value: T | null): value is T => value != null)
          )

          const routes = this.getRoutesFromCompilation(compiler, assets)

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
          this.routeModuleIdMap.clear()
        }
      })
    })
  }
}
