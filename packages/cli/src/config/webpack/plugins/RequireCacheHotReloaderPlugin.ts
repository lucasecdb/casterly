import { realpathSync } from 'fs'
import path from 'path'

import { Compiler } from 'webpack'

function deleteCache(path: string) {
  try {
    delete require.cache[realpathSync(path)]
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  } finally {
    delete require.cache[path]
  }
}

// This plugin flushes require.cache after emitting the files. Providing 'hot reloading' of server files.
export default class RequireCacheHotReloader {
  private prevAssetsOutput = new Set<string>()
  private currentAssetsOutput = new Set<string>()

  public apply(compiler: Compiler) {
    compiler.hooks.assetEmitted.tap(
      'RequireCacheHotReloader',
      (_, { targetPath }) => {
        deleteCache(targetPath)
        this.currentAssetsOutput.add(targetPath)
      }
    )

    compiler.hooks.afterEmit.tap('RequireCacheHotReloader', (compilation) => {
      const runtimeChunkPath = path.join(
        compilation.outputOptions.path!,
        'webpack-runtime.js'
      )

      deleteCache(runtimeChunkPath)

      for (const outputPath of this.prevAssetsOutput) {
        if (!this.currentAssetsOutput.has(outputPath)) {
          deleteCache(outputPath)
        }
      }

      this.prevAssetsOutput = new Set(this.currentAssetsOutput)
      this.currentAssetsOutput.clear()
    })
  }
}
