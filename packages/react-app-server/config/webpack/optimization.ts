import { Options } from 'webpack'
import TerserPlugin, { TerserPluginOptions } from 'terser-webpack-plugin'

import { Options as ArgOptions } from './types'
import { STATIC_RUNTIME_WEBPACK } from '../constants'

export const createOptimizationConfig = ({
  dev,
  isServer,
}: ArgOptions): Options.Optimization => {
  const terserPluginConfig: TerserPluginOptions = {
    parallel: true,
    sourceMap: false,
    cache: true,
    cacheKeys: (keys) => {
      delete keys.path
      return keys
    },
  }

  if (isServer) {
    return {
      splitChunks: false,
      minimize: false,
    }
  }

  const splitChunks: Options.SplitChunksOptions = {
    cacheGroups: {
      default: false,
      vendors: false,
      styles: {
        name: 'styles',
        test: /.(sa|sc|c)ss$/,
        chunks: 'all',
        enforce: true,
      },
    },
  }

  const config: Options.Optimization = {
    runtimeChunk: {
      name: STATIC_RUNTIME_WEBPACK,
    },
    splitChunks,
  }

  if (dev) {
    return config
  }

  config.minimizer = [new TerserPlugin(terserPluginConfig)]

  splitChunks.chunks = 'all'
  splitChunks.cacheGroups = {
    ...(splitChunks.cacheGroups as object),
    react: {
      name: 'commons',
      chunks: 'all',
      test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
    },
  }

  config.splitChunks = splitChunks

  return config
}
