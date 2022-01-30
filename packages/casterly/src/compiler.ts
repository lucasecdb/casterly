import * as path from 'path'

// @ts-ignore
import virtual from '@rollup/plugin-virtual'
import react from '@vitejs/plugin-react'
import polyfillNode from 'rollup-plugin-polyfill-node'
import { build } from 'vite'
import type { InlineConfig } from 'vite'

import type { CasterlyConfig } from './config'

interface BuildOptions {
  /**
   * Map with the routeId as key, and the corresponding file for that route,
   * relative to the application `src` directory
   */
  routeIdToFileMap: Record<string, string>
  /**
   * Whether to continuously watch for file changes
   */
  watch?: boolean
  /**
   * Mode to run the build on. With the production mode the files will be
   * minified and tree-shaken
   */
  mode: 'development' | 'production'
  /**
   * User config
   */
  config: CasterlyConfig
}

export async function buildServer({
  routeIdToFileMap,
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: true,
      routeIdToFileMap,
      config,
    })
  )

  return watcherOrBuildResult
}

export async function buildClient({
  routeIdToFileMap,
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: false,
      routeIdToFileMap,
      config,
    })
  )

  return watcherOrBuildResult
}

function createViteConfig(options: {
  isServer: boolean
  mode: 'production' | 'development'
  watch: boolean
  profile?: boolean
  routeIdToFileMap: Record<string, string>
  config: CasterlyConfig
}): InlineConfig {
  const { isServer, mode, routeIdToFileMap = {}, watch, config } = options

  return {
    root: config.appDirectory,
    base: '/',
    plugins: [
      virtual({
        '/server-entry': getServerEntrypointContent(routeIdToFileMap, config),
      }),
      react(),
      polyfillNode(),
    ],
    mode,
    clearScreen: false,
    logLevel: 'silent',
    configFile: false,
    assetsInclude: ['client/manifest.json'],
    build: {
      emptyOutDir: false,
      target: isServer ? 'node12' : 'es2020',
      minify: mode === 'production' && !isServer,
      outDir: isServer ? 'dist/' : 'dist/client',
      rollupOptions: {
        input: {
          index: isServer ? '/server-entry' : config.appBrowserEntry,
          ...Object.fromEntries(
            Object.entries(routeIdToFileMap).map(([routeId, fileName]) => [
              routeId,
              path.join('src', fileName),
            ])
          ),
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      manifest: true,
      ssr: true,
      ssrManifest: !isServer,
      watch: watch ? {} : undefined,
    },
    server: {
      middlewareMode: 'ssr',
    },
  }
}

function getServerEntrypointContent(
  routeIdToFileMap: Record<string, string>,
  config: CasterlyConfig
) {
  return `
import * as server from '${config.appServerEntry}'
${Object.values(routeIdToFileMap)
  .map(
    (module, index) =>
      `import * as route${index} from '${path.join(config.appSrc, module)}'`
  )
  .join('\n')}
import manifest from '${path.join(
    config.appBuildFolder,
    'client/manifest.json'
  )}'

const routes = {
  ${Object.keys(routeIdToFileMap)
    .map((routeId, index) => `'${routeId}': route${index},`)
    .join('\n')}
}

export { server, routes, manifest }
`
}
