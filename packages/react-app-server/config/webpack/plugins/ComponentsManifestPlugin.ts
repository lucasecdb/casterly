import { Compilation, Compiler, sources } from 'webpack'

import { COMPONENTS_MANIFEST_FILE, COMPONENT_NAME_REGEX } from '../../constants'

const { RawSource } = sources

// This plugin creates a components-manifest.json from page entrypoints.
export default class ComponentsManifestPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.make.tap('ComponentsManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ComponentsManifestPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
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

          assets[COMPONENTS_MANIFEST_FILE] = new RawSource(
            JSON.stringify(components, null, 2),
            true
          )
        }
      )
    })
  }
}
