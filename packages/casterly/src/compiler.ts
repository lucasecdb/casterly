// @ts-ignore
import virtual from '@rollup/plugin-virtual'
import react from '@vitejs/plugin-react'
import type { RollupWatcher, RollupWatcherEvent } from 'rollup'
import polyfillNode from 'rollup-plugin-polyfill-node'
import { build } from 'vite'
import type { InlineConfig } from 'vite'

import type { CasterlyConfig } from './config'

interface BuildOptions {
  /**
   * Array of route modules relative to app directory
   */
  routeModules: string[]
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
  routeModules,
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: true,
      routeModules,
      config,
    })
  )

  if (watch) {
    await new Promise<void>((resolve) => {
      const bundleListener = (evt: RollupWatcherEvent) => {
        if (evt.code === 'BUNDLE_END') {
          resolve()
          ;(watcherOrBuildResult as RollupWatcher).removeListener(
            'event',
            bundleListener
          )
        }
      }
      ;(watcherOrBuildResult as RollupWatcher).addListener(
        'event',
        bundleListener
      )
    })
  }

  return watcherOrBuildResult
}

export async function buildClient({
  routeModules,
  watch = false,
  mode,
  config,
}: BuildOptions) {
  const watcherOrBuildResult = await build(
    createViteConfig({
      watch,
      mode,
      isServer: false,
      routeModules,
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
  routeModules: string[]
  config: CasterlyConfig
}): InlineConfig {
  const { isServer, mode, routeModules = [], watch, config } = options

  return {
    root: config.appDirectory,
    base: '/',
    plugins: [
      react(),
      polyfillNode(),
      virtual({
        ...(isServer
          ? {
              'entry-server': `export default "hello world"`,
            }
          : null),
      }),
    ],
    mode,
    clearScreen: false,
    logLevel: 'silent',
    configFile: false,
    build: {
      target: isServer ? 'node12' : 'modules',
      minify: mode === 'development' || isServer ? false : true,
      outDir: isServer ? 'dist/server' : 'dist/client',
      rollupOptions: {
        input: [
          isServer ? 'entry-server' : config.appBrowserEntry,
          ...routeModules,
        ],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      manifest: true,
      ssr: isServer,
      ssrManifest: isServer,
      watch: watch ? {} : undefined,
    },
    server: {
      middlewareMode: 'ssr',
    },
  }
}
