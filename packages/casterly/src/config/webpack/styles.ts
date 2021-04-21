// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import type { RuleSetUse } from 'webpack'

import type { Options } from './types'

interface StyleOptions extends Options {
  cssModules?: boolean
  loaders?: RuleSetUse[]
  postcssPlugins: any[]
}

// style files regexes
export const cssGlobalRegex = /\.global\.css$/
export const cssRegex = /\.css$/
export const sassGlobalRegex = /\.global\.(scss|sass)$/
export const sassRegex = /\.(scss|sass)$/

// common function to get style loaders
export const getStyleLoaders = ({
  isServer = false,
  dev = false,
  cssModules = false,
  loaders = [],
  postcssPlugins,
}: StyleOptions): RuleSetUse => {
  const postcssLoader = {
    // Options for PostCSS as we reference these options twice
    // Adds vendor prefixing based on your specified browser support in
    // package.json
    loader: require.resolve('postcss-loader'),
    options: {
      postcssOptions: {
        // Necessary for external CSS imports to work
        // https://github.com/facebook/create-react-app/issues/2677
        ident: 'postcss',
        map: {
          inline: false,
          annotate: false,
        },
        config: false,
        plugins: postcssPlugins,
      },
    },
  }

  const cssLoader = {
    loader: require.resolve('css-loader'),
    options: {
      importLoaders: 1 + loaders.length,
      modules: cssModules
        ? {
            auto: /.*/,
            localIdentName: dev ? '[path][name]__[local]' : '[hash:base64]',
            localIdentHashPrefix: 'css',
            exportOnlyLocals: isServer,
          }
        : false,
    },
  }

  if (isServer && !cssModules) {
    return ['ignore-loader']
  }

  return [
    !isServer && {
      loader: MiniCssExtractPlugin.loader,
      options: {
        modules: cssModules ? { namedExport: false } : undefined,
      },
    },
    cssLoader,
    postcssLoader,
    ...loaders,
  ].filter(Boolean) as RuleSetUse
}
