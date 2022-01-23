import * as path from 'path'

import { paths } from '@casterly/utils'
import react from '@vitejs/plugin-react'
import polyfillNode from 'rollup-plugin-polyfill-node'
import type { InlineConfig } from 'vite'

export const viteConfig: InlineConfig = {
  root: paths.appDirectory,
  base: '/',
  plugins: [react(), polyfillNode()],
  build: {
    rollupOptions: {
      input: [paths.appServerEntry /*paths.appRoutesJs*/],
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    manifest: true,
    ssrManifest: true,
  },
}

export interface Options {
  isServer?: boolean
  dev?: boolean
  profile?: boolean
  routeModules: string[]
}

export const createViteConfig = async (
  options?: Options
): Promise<InlineConfig> => {
  const { isServer = false, dev = false, routeModules = [] } = options ?? {}

  return {
    root: paths.appDirectory,
    base: '/',
    plugins: [react(), polyfillNode()],
    build: {
      minify: dev ? false : undefined,
      outDir: isServer ? 'dist/server' : 'dist/client',
      rollupOptions: {
        input: [
          isServer ? paths.appServerEntry : paths.appBrowserEntry,
          ...routeModules.map((p) => path.join(paths.appDirectory, p)),
          // paths.appRoutesJs,
        ],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      manifest: true,
      ssrManifest: isServer,
    },
    ...(isServer
      ? {
          server: {
            middlewareMode: 'ssr',
          },
        }
      : null),
  }
}
