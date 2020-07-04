import { Compiler, Plugin } from 'webpack'
import { RawSource } from 'webpack-sources'

import { COMPONENTS_MANIFEST_FILE, COMPONENT_NAME_REGEX } from '../../constants'

// This plugin creates a components-manifest.json from page entrypoints.
export default class ComponentsManifestPlugin implements Plugin {
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync(
      'ComponentsManifestPlugin',
      (compilation, callback) => {
        const { chunks } = compilation
        const components: { [component: string]: string } = {}

        for (const chunk of chunks) {
          const result = COMPONENT_NAME_REGEX.exec(chunk.name)

          if (!result) {
            continue
          }

          const componentName = result[1]

          // Write filename, replace any backslashes in path (on windows)
          // with forwardslashes for cross-platform consistency.
          components[componentName.replace(/\\/g, '/')] =
            chunk.name.replace(/\\/g, '/') + '.js'
        }

        compilation.assets[COMPONENTS_MANIFEST_FILE] = new RawSource(
          JSON.stringify(components, null, 2)
        )

        callback()
      }
    )
  }
}
