import path from 'path'

import { Compilation, EntryPlugin, NormalModule, node, sources } from 'webpack'
import type { Compiler } from 'webpack'

import {
  ROUTES_MANIFEST_FILE,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_ENTRYPOINTS_ROUTES_ASSETS,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
} from '../../constants'
import paths from '../../paths'
import type { RouteAssetComponent } from '../utils'
import { evalModuleCode, parseRoutesAndAssets } from '../utils'
import RouteAssetsChildPlugin from './RouteAssetsChildPlugin'

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

          const mainEntrypointAssets =
            getNamedEntrypointAssets(STATIC_RUNTIME_MAIN)
          const hotEntrypointAssets =
            getNamedEntrypointAssets(STATIC_RUNTIME_HOT)

          const mainAssets = mainEntrypointAssets.concat(
            hotEntrypointAssets.filter(
              (file) => !mainEntrypointAssets.includes(file)
            )
          )

          const compilationModules = Array.from(compilation.modules.values())

          const entrypointChunk = Array.from(compilation.chunks).find(
            (chunk) => chunk.id === STATIC_ENTRYPOINTS_ROUTES
          )

          const entrypointModules =
            entrypointChunk &&
            compilation.chunkGraph.getChunkModules(entrypointChunk)

          const routesModule = entrypointModules?.find(
            (module) =>
              module instanceof NormalModule &&
              module.userRequest === paths.appRoutesJs
          )

          const dependencies = routesModule?.blocks?.flatMap(
            (block) => block.dependencies
          )

          const moduleIdMap = Object.fromEntries(
            dependencies?.map((dependency) => {
              const dependencyModule =
                compilation.moduleGraph.getResolvedModule(dependency)

              const userRequest = (dependencyModule as NormalModule).userRequest
              const modulePath =
                '.' + path.sep + path.relative(compiler.context, userRequest)

              const moduleId = compilation.chunkGraph.getModuleId(
                compilation.moduleGraph.getModule(dependency)
              )

              return [modulePath, moduleId]
            }) ?? []
          )

          // Create a map of the module name to its assets, to
          // be later used with the routes-assets.js file to
          // gather the chunks for a particular route.
          const routeComponentsAssets = Object.fromEntries(
            Array.from(Object.values(moduleIdMap))
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
                    const asyncChunks = chunk.hasAsyncChunks()
                      ? Array.from(chunk.getAllAsyncChunks())
                      : []

                    const referencedChunksFiles = Array.from(
                      chunk.getAllReferencedChunks()
                    )
                      .filter((chunk) => !asyncChunks.includes(chunk))
                      .flatMap((referencedChunk) => {
                        const files = Array.from(referencedChunk.files.values())

                        return files
                      })
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
            moduleIdMap
          )

          assets[ROUTES_MANIFEST_FILE] = new RawSource(
            JSON.stringify(routesManifest, null, 2),
            true
          )
        }
      )
    })
  }
}
