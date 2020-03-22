// based on https://github.com/zeit/next.js/blob/canary/packages/next/build/webpack/plugins/build-manifest-plugin.ts

import { Compiler } from 'webpack'
import { RawSource } from 'webpack-sources'

import {
  ASSET_MANIFEST_FILE,
  COMPONENT_NAME_REGEX,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
} from '../../constants'

interface AssetMap {
  main: string[]
  components: {
    [s: string]: string[]
  }
}

// This plugin creates a asset-manifest.json for all assets that are being output
// It has a mapping of "entry" filename to real filename. Because the real filename can be hashed in production
export default class BuildManifestPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync(
      'BuildManifestPlugin',
      (compilation, callback) => {
        const { chunks } = compilation

        const mainJsFiles: string[] =
          chunks
            .find((c) => c.name === STATIC_RUNTIME_MAIN)
            .files?.filter?.((file: string) => /\.js$/.test(file))
            ?.map((file: string) => '/' + file) ?? []

        const hotModuleFiles: string[] =
          chunks
            .find((c) => c.name === STATIC_RUNTIME_HOT)
            .files?.filter?.((file: string) => /\.js$/.test(file))
            ?.map((file: string) => '/' + file) ?? []

        const assetMap: AssetMap = {
          main: mainJsFiles.concat(hotModuleFiles),
          components: {},
        }

        for (const [, entrypoint] of compilation.entrypoints.entries()) {
          const result = COMPONENT_NAME_REGEX.exec(entrypoint.name)

          if (!result) {
            continue
          }

          const componentName = result[1]

          const filesForEntry: string[] = []

          for (const file of entrypoint.getFiles()) {
            if (/\.map$/.test(file) || /\.hot-update\.js$/.test(file)) {
              continue
            }

            if (!/\.js$/.test(file) && !/\.css$/.test(file)) {
              continue
            }

            filesForEntry.push('/' + file.replace(/\\/g, '/'))
          }

          assetMap.components[componentName] = [
            ...mainJsFiles,
            ...hotModuleFiles,
            ...filesForEntry,
          ]
        }

        compilation.assets[ASSET_MANIFEST_FILE] = new RawSource(
          JSON.stringify(assetMap, null, 2)
        )

        callback()
      }
    )
  }
}
