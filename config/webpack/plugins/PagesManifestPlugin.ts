import { Compiler, Plugin } from 'webpack'
import { RawSource } from 'webpack-sources'
import { PAGES_MANIFEST_FILE } from '../../constants'

// This plugin creates a pages-manifest.json from page entrypoints.
export default class PagesManifestPlugin implements Plugin {
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tap('PagesManifestPlugin', (compilation, callback) => {
      const { chunks } = compilation
      const pages: { [page: string]: string } = {}

      for (const chunk of chunks) {
        const pagePath = chunk.name

        if (!pagePath) {
          continue
        }

        // Write filename, replace any backslashes in path (on windows) with forwardslashes for cross-platform consistency.
        pages[`/${pagePath.replace(/\\/g, '/')}`] = chunk.name.replace(
          /\\/g,
          '/'
        )
      }

      compilation.assets[PAGES_MANIFEST_FILE] = new RawSource(
        JSON.stringify(pages, null, 2)
      )

      callback()
    })
  }
}
