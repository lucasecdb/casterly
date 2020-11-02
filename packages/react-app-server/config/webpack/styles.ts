// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { RuleSetUse } from 'webpack'

import { Options } from './types'

interface StyleOptions extends Options {
  cssModules?: boolean
  loaders?: RuleSetUse[]
}

// common function to get style loaders
export const getStyleLoaders = ({
  isServer = false,
  dev = false,
  cssModules = false,
  loaders = [],
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
        plugins: [
          require.resolve('postcss-flexbugs-fixes'),
          [
            require.resolve('postcss-preset-env'),
            {
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            },
          ],
        ],
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
    !isServer && dev && 'extracted-loader',
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
