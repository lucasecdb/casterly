import { Compiler, Plugin } from 'webpack'
import { RawSource } from 'webpack-sources'
import { COMPONENT_NAME_REGEX, PAGES_MANIFEST_FILE } from '../../constants'

// This plugin creates a pages-manifest.json from page entrypoints.
export default class PagesManifestPlugin implements Plugin {
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync(
      'PagesManifestPlugin',
      (compilation, callback) => {
        const { chunks } = compilation
        const pages: { [page: string]: string } = {}

        for (const chunk of chunks) {
          const result = COMPONENT_NAME_REGEX.exec(chunk.name)

          if (!result) {
            continue
          }

          const componentName = result[1]

          // Write filename, replace any backslashes in path (on windows)
          // with forwardslashes for cross-platform consistency.
          pages[componentName.replace(/\\/g, '/')] =
            chunk.name.replace(/\\/g, '/') + '.js'
        }

        compilation.assets[PAGES_MANIFEST_FILE] = new RawSource(
          JSON.stringify(pages, null, 2)
        )

        callback()
      }
    )
  }
}