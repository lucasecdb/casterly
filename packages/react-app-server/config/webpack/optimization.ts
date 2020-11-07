import crypto from 'crypto'
import { sep } from 'path'

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
// @ts-ignore: TODO: typings incompatible with webpack 5
import TerserPlugin, { TerserPluginOptions } from 'terser-webpack-plugin'
import { Chunk, Configuration, Module } from 'webpack'

import { STATIC_CHUNKS_PATH, STATIC_RUNTIME_WEBPACK } from '../constants'
import { appPath } from '../paths'
import { Options as ArgOptions } from './types'

const isModuleCSS = (module: Module): boolean => {
  return (
    // mini-css-extract-plugin
    module.type === `css/mini-extract`
  )
}

const BYTE = 1
const KILOBYTE = 1000 * BYTE

interface Options extends ArgOptions {
  numberOfRoutes?: number
}

export const createOptimizationConfig = ({
  dev,
  isServer,
  numberOfRoutes = 0,
}: Options): Required<Configuration>['optimization'] => {
  const terserPluginConfig: TerserPluginOptions = {
    parallel: true,
  }

  if (isServer) {
    return {
      splitChunks: false,
      minimize: false,
      emitOnErrors: false,
    }
  }

  const splitChunks: Required<Configuration>['optimization']['splitChunks'] = {
    cacheGroups: {
      default: false,
      defaultVendors: false,
      styles: {
        name: 'styles',
        test(module: Module) {
          // TODO: do not include CSS modules
          return isModuleCSS(module)
        },
        chunks: 'all',
        enforce: true,
      },
    },
  }

  const config: Required<Configuration>['optimization'] = {
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
          /node_modules[/\\]/.test(module.identifier())
        )
      },
      name(module: Module) {
        const hash = crypto.createHash('sha1')

        if (!module.libIdent) {
          throw new Error(
            `Encountered unknown module type: ${module.type}. Please open an issue.`
          )
        }

        hash.update(module.libIdent({ context: appPath }))

        return (
          STATIC_CHUNKS_PATH + sep + 'lib-' + hash.digest('hex').substring(0, 8)
        )
      },
      priority: 30,
      minChunks: 1,
      reuseExistingChunk: true,
    },
    commons: {
      name: STATIC_CHUNKS_PATH + sep + 'commons',
      minChunks: Math.max(numberOfRoutes, 2),
      priority: 20,
    },
    shared: {
      test(module: Module) {
        return !isModuleCSS(module)
      },
      name(_: Module, chunks: Chunk[]) {
        return (
          STATIC_CHUNKS_PATH +
          sep +
          'shared-' +
          crypto
            .createHash('sha1')
            .update(
              chunks.reduce((acc, chunk) => {
                return acc + chunk.name
              }, '')
            )
            .digest('hex')
        )
      },
      priority: 10,
      minChunks: 2,
      reuseExistingChunk: true,
    },
  }

  splitChunks.maxInitialRequests = 25
  splitChunks.minSize = 20 * KILOBYTE

  config.splitChunks = splitChunks

  return config
}
