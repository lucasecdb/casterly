import crypto from 'crypto'
import { sep } from 'path'

// @ts-ignore
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
// @ts-ignore: TODO: typings incompatible with webpack 5
import TerserPlugin from 'terser-webpack-plugin'
import type { Configuration, Module } from 'webpack'

import { STATIC_CHUNKS_PATH, STATIC_RUNTIME_WEBPACK } from '../constants'
import paths from '../paths'
import type { Options as ArgOptions } from './types'

const isModuleCSS = (module: Module): boolean => {
  return (
    // mini-css-extract-plugin
    module.type === `css/mini-extract`
  )
}

const BYTE = 1
const KILOBYTE = 1000 * BYTE

interface Options extends ArgOptions {
  getNumberOfRoutes(): number
}

export const createOptimizationConfig = ({
  dev,
  isServer,
  getNumberOfRoutes,
}: Options): Required<Configuration>['optimization'] => {
  const terserPluginConfig = {
    parallel: true,
  }

  if (isServer) {
    return {
      nodeEnv: false,
      runtimeChunk: {
        name: 'webpack-runtime',
      },
      splitChunks: false,
      minimize: false,
      emitOnErrors: false,
    }
  }

  const splitChunks: Required<Configuration>['optimization']['splitChunks'] = {
    cacheGroups: {},
  }

  const config: Required<Configuration>['optimization'] = {
    nodeEnv: false,
    runtimeChunk: {
      name: STATIC_RUNTIME_WEBPACK,
    },
    splitChunks,
    emitOnErrors: false,
  }

  if (dev) {
    return config
  }

  config.minimizer = [
    // @ts-ignore
    new TerserPlugin(terserPluginConfig),
    new CssMinimizerPlugin(),
  ]

  splitChunks.chunks = 'all'

  splitChunks.cacheGroups = {
    ...(splitChunks.cacheGroups as Record<string, unknown>),
    react: {
      name: `${STATIC_CHUNKS_PATH}${sep}react`,
      chunks: 'all',
      test: /[\\/]node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/,
      priority: 40,
      enforce: true,
    },
    lib: {
      test(module: Module) {
        return (
          !isModuleCSS(module) &&
          module.size() > 160 * KILOBYTE &&
          /node_modules[/\\]/.test(module.nameForCondition() || '')
        )
      },
      name(module: Module) {
        const hash = crypto.createHash('sha1')

        if (!module.libIdent) {
          throw new Error(
            `Encountered unknown module type: ${module.type}. Please open an issue.`
          )
        }

        hash.update(module.libIdent({ context: paths.appPath }) ?? '')

        return (
          STATIC_CHUNKS_PATH + sep + 'lib-' + hash.digest('hex').substring(0, 8)
        )
      },
      priority: 30,
      minChunks: 1,
      reuseExistingChunk: true,
    },
    commons: () => ({
      name: STATIC_CHUNKS_PATH + sep + 'commons',
      minChunks: Math.max(getNumberOfRoutes(), 2),
      priority: 20,
    }),
    styles: {
      name: 'styles',
      test(module: Module) {
        // TODO: do not include CSS modules
        return isModuleCSS(module)
      },
      chunks: 'all',
      enforce: true,
    },
  }

  splitChunks.maxInitialRequests = 25
  splitChunks.minSize = 20 * KILOBYTE

  config.splitChunks = splitChunks

  return config
}
