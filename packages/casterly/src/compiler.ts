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
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: true,
      config,
    })
  )

  return watcherOrBuildResult
}

export async function buildClient({
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: false,
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
  config: CasterlyConfig
}): InlineConfig {
  const { isServer, mode, watch, config } = options

  return {
    root: config.appDirectory,
    base: '/',
    plugins: [
      virtual({
        '/server-entry': getServerEntrypointContent(config),
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
            Object.entries(config.routes).map(([routeId, configRoute]) => [
              routeId,
              path.join('src', configRoute.file),
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

function getServerEntrypointContent(config: CasterlyConfig) {
  return `
import * as server from '${config.appServerEntry}'
${Object.values(config.routes)
  .map(
    (module, index) =>
      `import * as route${index} from '${path.join(
        config.appSrc,
        module.file
      )}'`
  )
  .join('\n')}

export { default as manifest } from '${path.join(
    config.appBuildFolder,
    'client/manifest.json'
  )}'

export const routes = {
  ${Object.keys(config.routes)
    .map(
      (routeId, index) => `'${routeId}': {
    id: ${JSON.stringify(routeId)},
    path: ${JSON.stringify(config.routes[routeId].path)},
    parentId: ${JSON.stringify(config.routes[routeId].parentId)},
    index: ${config.routes[routeId].index},
    file: ${JSON.stringify(path.join('src', config.routes[routeId].file))},
    module: route${index},
  },`
    )
    .join('\n')}
}

export const assetServerUrl = import.meta.env.DEV ? 'http://localhost:${
    config.devServerPort
  }' : ''

export { server }
`
}
