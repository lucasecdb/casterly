import TerserPlugin, { TerserPluginOptions } from 'terser-webpack-plugin'
import { Options } from 'webpack'

import { STATIC_RUNTIME_WEBPACK } from '../constants'
import { Options as ArgOptions } from './types'

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
      noEmitOnErrors: true,
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
    noEmitOnErrors: true,
  }

  if (dev) {
    return config
  }

  config.minimizer = [new TerserPlugin(terserPluginConfig)]

  splitChunks.chunks = 'all'
  splitChunks.cacheGroups = {
    ...(splitChunks.cacheGroups as Record<string, unknown>),
    react: {
      name: 'commons',
      chunks: 'all',
      test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
    },
  }

  config.splitChunks = splitChunks

  return config
}
