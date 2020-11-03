import { RuntimeGlobals, javascript, sources } from 'webpack'
import type { Compiler } from 'webpack'
// @ts-ignore
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import RouteImportDependencyTemplate from './RouteImportDependencyTemplate'

const { ReplaceSource } = sources
const { JavascriptModulesPlugin } = javascript

const PLUGIN_NAME = 'RouteManifestChildPlugin'

export default class RouteManifestChildPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      { name: PLUGIN_NAME, stage: Infinity },
      (compilation) => {
        compilation.dependencyTemplates = compiler.parentCompilation.dependencyTemplates.clone()

        compilation.dependencyTemplates.set(
          ImportDependency,
          new RouteImportDependencyTemplate(compiler.context)
        )
      }
    )

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      // Set the main template to return the exports value in
      // the main IIFE, so we can export it in the hook below
      compilation.hooks.additionalModuleRuntimeRequirements.tap(
        PLUGIN_NAME,
        (_, set) => {
          set.add(RuntimeGlobals.returnExportsFromRuntime)
        }
      )

      // Add exports to the main template
      JavascriptModulesPlugin.getCompilationHooks(compilation).renderMain.tap(
        PLUGIN_NAME,
        (source) => {
          const replaceSource = new ReplaceSource(source, 'export return')

          replaceSource.insert(0, 'module.exports = ', 'export return')

          return replaceSource
        }
      )

      // Remove chunks generated from the dynamic imports
      // of the routes.js file, as so to not conflict with
      // the chunks generated in the parent compiler
      compilation.hooks.chunkAsset.tap(PLUGIN_NAME, (chunk) => {
        if (chunk.isOnlyInitial()) {
          return
        }

        compilation.chunkGraph.disconnectChunk(chunk)

        chunk.files.forEach((file) => {
          compilation.deleteAsset(file)
        })
        chunk.auxiliaryFiles.forEach((file) => {
          compilation.deleteAsset(file)
        })
      })
    })
  }
}
