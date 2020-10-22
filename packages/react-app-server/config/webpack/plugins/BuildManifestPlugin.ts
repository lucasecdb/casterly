// based on https://github.com/zeit/next.js/blob/canary/packages/next/build/webpack/plugins/build-manifest-plugin.ts

import { Compilation, Compiler, sources } from 'webpack'

import {
  ASSET_MANIFEST_FILE,
  COMPONENT_NAME_REGEX,
  STATIC_RUNTIME_MAIN,
} from '../../constants'

const { RawSource } = sources

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
    compiler.hooks.make.tap('BuildManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'BuildManifestPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          const { namedChunks } = compilation

          const mainJsFiles: string[] =
            Array.from(namedChunks.get(STATIC_RUNTIME_MAIN)?.files ?? [])
              .filter((file: string) => /(?<!\.hot-update)\.js$/.test(file))
              .map((file: string) => '/' + file) ?? []

          const assetMap: AssetMap = {
            main: mainJsFiles,
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
              ...filesForEntry,
            ]
          }

          assets[ASSET_MANIFEST_FILE] = new RawSource(
            JSON.stringify(assetMap, null, 2),
            true
          )
        }
      )
    })
  }
}
