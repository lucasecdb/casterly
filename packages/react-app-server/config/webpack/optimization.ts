import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
// @ts-ignore: TODO: typings incompatible with webpack 5
import TerserPlugin, { TerserPluginOptions } from 'terser-webpack-plugin'
import { Configuration } from 'webpack'

import { STATIC_CHUNKS_PATH, STATIC_RUNTIME_WEBPACK } from '../constants'
import { Options as ArgOptions } from './types'

export const createOptimizationConfig = ({
  dev,
  isServer,
}: ArgOptions): Configuration['optimization'] => {
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
        test: /.(sa|sc|c)ss$/,
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
      name: `${STATIC_CHUNKS_PATH}/react`,
      chunks: 'all',
      test: /[\\/]node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/,
    },
  }

  config.splitChunks = splitChunks

  return config
}
