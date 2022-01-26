import { paths } from '@casterly/utils'
import react from '@vitejs/plugin-react'
import polyfillNode from 'rollup-plugin-polyfill-node'
import type { InlineConfig } from 'vite'

export interface Options {
  isServer?: boolean
  dev?: boolean
  profile?: boolean
  routeModules: string[]
}

export const createViteConfig = (options?: Options): InlineConfig => {
  const { isServer = false, dev = false, routeModules = [] } = options ?? {}

  return {
    root: paths.appDirectory,
    base: '/',
    plugins: [react(), polyfillNode()],
    mode: dev ? 'development' : 'production',
    clearScreen: false,
    logLevel: 'silent',
    build: {
      target: isServer ? 'node12' : 'modules',
      minify: dev || isServer ? false : true,
      outDir: isServer ? 'dist/server' : 'dist/client',
      rollupOptions: {
        input: [
          isServer ? paths.appServerEntry : paths.appBrowserEntry,
          ...routeModules,
        ],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      manifest: true,
      ssr: isServer,
      ssrManifest: isServer,
      watch: isServer && dev ? {} : undefined,
    },
    server: {
      middlewareMode: 'ssr',
    },
  }
}
