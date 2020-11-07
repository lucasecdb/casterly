import { realpathSync } from 'fs'
import path from 'path'

import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
// @ts-ignore: typings not up-to-date
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin'
// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import semver from 'semver'
import webpack, { Compiler, Configuration } from 'webpack'

import { getDependencyVersion } from '../utils/dependencies'
import fileExists from '../utils/fileExists'
import { filterBoolean } from '../utils/filterBoolean'
import resolveRequest from '../utils/resolveRequest'
import {
  STATIC_CHUNKS_PATH,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_MEDIA_PATH,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_WEBPACK_PATH,
} from './constants'
import getClientEnvironment from './env'
import * as paths from './paths'
import { createOptimizationConfig } from './webpack/optimization'
import RequireCacheHotReloaderPlugin from './webpack/plugins/RequireCacheHotReloaderPlugin'
import SSRImportPlugin from './webpack/plugins/SSRImportPlugin'
import RoutesManifestPlugin from './webpack/plugins/routes/RoutesManifestPlugin'
import {
  cssModuleRegex,
  cssRegex,
  getStyleLoaders,
  sassModuleRegex,
  sassRegex,
} from './webpack/styles'
import { Options } from './webpack/types'
import { createWorkboxPlugin } from './webpack/workbox'

const getBaseWebpackConfig = async (
  options?: Options
): Promise<Configuration> => {
  const { isServer = false, dev = false, profile = false } = options ?? {}

  // Get environment variables to inject into our app.
  const env = getClientEnvironment({ isServer })

  const sassLoaderConfig = {
    loader: 'sass-loader',
    options: {
      sassOptions: {
        includePaths: paths.appNodePath,
      },
    },
  }

  const cssConfig = getStyleLoaders({ dev, isServer })
  const cssModuleConfig = getStyleLoaders({ dev, isServer, cssModules: true })
  const sassConfig = getStyleLoaders({
    dev,
    isServer,
    loaders: [sassLoaderConfig],
  })
  const sassModuleConfig = getStyleLoaders({
    dev,
    isServer,
    cssModules: true,
    loaders: [sassLoaderConfig],
  })

  const cssRules = [
    {
      test: cssRegex,
      use: cssConfig,
    },
    {
      test: cssModuleRegex,
      exclude: [cssRegex, /node_modules/],
      use: cssModuleConfig,
    },
    {
      test: sassRegex,
      use: sassConfig,
    },
    {
      test: sassModuleRegex,
      exclude: [sassRegex, /node_modules/],
      use: sassModuleConfig,
    },
  ]

  const routesManifestPluginInstance = !isServer
    ? new RoutesManifestPlugin()
    : null

  const dir = paths.appBuildFolder
  const outputDir = isServer ? 'server' : ''
  const outputPath = path.join(dir, outputDir)
  const webpackMode = dev ? 'development' : 'production'

  const reactVersion = await getDependencyVersion(paths.appPath, 'react')
  const hasJsxRuntime =
    reactVersion != null && semver.satisfies(reactVersion, '^16.4.0 || >=17')

  const typescriptPath = require.resolve('typescript', {
    paths: [paths.appNodeModules],
  })

  const useTypescript =
    !!typescriptPath && (await fileExists(paths.appTsConfig))

  const hasServiceWorker = await fileExists(paths.appServiceWorker)

  const chunkFilename = dev ? '[name]' : '[name].[contenthash]'
  const extractedCssFilename = dev ? '[name]' : '[name].[contenthash:8]'

  const externals = isServer
    ? [
        (
          { context, request }: { context: string; request: string },
          callbackFn: any
        ) => {
          const excludedModules: string[] = [
            // add modules that should be transpiled here
          ]

          // make typescript happy because this function
          // can be called without arguments
          const callback = (callbackFn as unknown) as (
            error?: any,
            result?: any
          ) => void

          if (excludedModules.indexOf(request) !== -1) {
            return callback()
          }

          let res: string | undefined

          try {
            // Resolve the import with the webpack provided context, this
            // ensures we're resolving the correct version when multiple
            // exist.
            res = resolveRequest(request, `${context}/`)
          } catch (_) {
            // If the request cannot be resolved, we need to tell webpack to
            // "bundle" it so that webpack shows an error (that it cannot be
            // resolved).
            return callback()
          }

          // Same as above, if the request cannot be resolved we need to have
          // webpack "bundle" it so it surfaces the not found error.
          if (!res) {
            callback()
          }

          // Bundled Node.js code is relocated without its node_modules tree.
          // This means we need to make sure its request resolves to the same
          // package that'll be available at runtime. If it's not identical,
          // we need to bundle the code (even if it _should_ be external).
          let baseRes
          try {
            baseRes = resolveRequest(request, `${dir}/`)
          } catch (_) {
            // ignore me
          }

          // Same as above: if the package, when required from the root,
          // would be different from what the real resolution would use, we
          // cannot externalize it.
          if (
            !baseRes ||
            (baseRes !== res &&
              // if res and baseRes are symlinks they could point to the the same file
              realpathSync(baseRes) !== realpathSync(res))
          ) {
            return callback()
          }

          if (res.match(/react-app-server[/\\]lib[/\\]/)) {
            return callback()
          }

          // Webpack itself has to be compiled because it doesn't always use module relative paths
          if (
            res.match(/node_modules[/\\]webpack/) ||
            res.match(/node_modules[/\\]css-loader/)
          ) {
            return callback()
          }

          // Anything else that is standard JavaScript within `node_modules`
          // can be externalized.
          if (res.match(/node_modules[/\\].*\.js$/)) {
            return callback(undefined, `commonjs ${request}`)
          }

          // Default behavior: bundle the code!
          callback()
        },
      ]
    : undefined

  const baseBabelOptions = {
    babelrc: false,
    presets: [
      require.resolve('@babel/preset-env'),
      require.resolve('@babel/preset-typescript'),
    ],
    plugins: [
      [
        require.resolve('babel-plugin-named-asset-import'),
        {
          loaderMap: {
            svg: {
              ReactComponent: '@svgr/webpack?-prettier,-svgo![path]',
            },
          },
        },
      ],
      require.resolve('@babel/plugin-transform-runtime'),
      require.resolve('@babel/plugin-proposal-class-properties'),
      require.resolve('@babel/plugin-syntax-dynamic-import'),
      require.resolve('babel-plugin-macros'),
    ],
    cacheDirectory: path.join(paths.appBuildFolder, 'cache', 'webpack'),
    // Don't waste time on Gzipping the cache
    cacheCompression: false,
  }

  const entrypoints = {
    [STATIC_ENTRYPOINTS_ROUTES]: paths.appRoutesJs,
  }

  const appSrcFiles = [
    paths.appSrc,
    paths.appServerEntry,
    paths.appBrowserEntry,
  ]

  return {
    mode: webpackMode,
    name: isServer ? 'server' : 'client',
    target: isServer ? 'node' : 'web',
    devtool: dev ? 'cheap-module-source-map' : false,
    context: paths.appPath,
    externals,
    entry: () => ({
      ...entrypoints,
      ...(!isServer
        ? {
            [STATIC_RUNTIME_MAIN]: paths.appBrowserEntry,
            ...(dev ? { [STATIC_RUNTIME_HOT]: paths.serverClientHot } : null),
          }
        : { [STATIC_RUNTIME_MAIN]: paths.appServerEntry }),
    }),
    watchOptions: {
      ignored: ['**/.git/**', '**/node_modules/**', '**/.dist/**'],
    },
    output: {
      publicPath: '/',
      path: outputPath,
      filename: isServer
        ? '[name].js'
        : `[name]${dev ? '' : '-[chunkhash]'}.js`,
      chunkFilename: isServer
        ? `${chunkFilename}.js`
        : `${STATIC_CHUNKS_PATH}/${chunkFilename}.js`,
      hotUpdateMainFilename: `${STATIC_WEBPACK_PATH}/[fullhash].hot-update.json`,
      hotUpdateChunkFilename: `${STATIC_WEBPACK_PATH}/[id].[fullhash].hot-update.js`,
      devtoolModuleFilenameTemplate: (info: any) =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
      library: isServer ? undefined : '_RS',
      libraryTarget: isServer ? 'commonjs2' : 'assign',
    },
    performance: { hints: false },
    optimization: createOptimizationConfig({
      dev,
      isServer,
      getNumberOfRoutes: () =>
        routesManifestPluginInstance?.getNumberOfRoutes() ?? 0,
    }),
    resolve: {
      modules: ['node_modules'].concat(
        process.env.NODE_PATH!.split(path.delimiter).filter(Boolean)
      ),
      extensions: [
        ...(useTypescript
          ? paths.typescriptFileExtensions.map((ext) => '.' + ext)
          : []),
        ...paths.moduleFileExtensions.map((ext) => `.${ext}`),
      ],
      alias: {
        ...(!isServer
          ? {
              buffer: require.resolve('buffer'),
            }
          : null),
        ...(!isServer && !dev && profile
          ? {
              'react-dom$': 'react-dom/profiling',
              'scheduler/tracing': 'scheduler/tracing-profiling',
            }
          : null),
      },
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        { parser: { requireEnsure: false } },
        {
          oneOf: [
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
                name: `${STATIC_MEDIA_PATH}/[name].[hash:8].[ext]`,
              },
            },
            {
              test: /\.(js|mjs|ts)$/,
              include: appSrcFiles,
              loader: require.resolve('babel-loader'),
              options: baseBabelOptions,
            },
            {
              test: /\.(jsx|tsx)$/,
              include: appSrcFiles,
              loader: require.resolve('babel-loader'),
              options: {
                ...baseBabelOptions,
                presets: [
                  ...baseBabelOptions.presets,
                  [
                    require.resolve('@babel/preset-react'),
                    {
                      runtime: hasJsxRuntime ? 'automatic' : 'classic',
                    },
                  ],
                ],
                plugins: [
                  ...baseBabelOptions.plugins,
                  !isServer && dev && 'react-refresh/babel',
                ].filter(Boolean),
              },
            },
            {
              test: /\.(js|mjs)$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: false,
                configFile: false,
                compact: false,
                cacheDirectory: true,
                // Don't waste time on Gzipping the cache
                cacheCompression: false,

                presets: [
                  [
                    require.resolve('@babel/preset-env'),
                    {
                      useBuiltIns: 'entry',
                      corejs: 3,
                      modules: false,
                      exclude: ['transform-typeof-symbol'],
                    },
                  ],
                ],
                plugins: [
                  [
                    require.resolve('@babel/plugin-transform-destructuring'),
                    {
                      loose: false,
                      selectiveLoose: [
                        'useState',
                        'useEffect',
                        'useContext',
                        'useReducer',
                        'useCallback',
                        'useMemo',
                        'useRef',
                        'useImperativeHandle',
                        'useLayoutEffect',
                        'useDebugValue',
                      ],
                    },
                  ],
                  require.resolve('@babel/plugin-transform-runtime'),
                  require.resolve('@babel/plugin-syntax-dynamic-import'),
                ],

                // If an error happens in a package, it's possible to be
                // because it was compiled. Thus, we don't want the browser
                // debugger to show the original code. Instead, the code
                // being evaluated would be much more helpful.
                sourceMaps: false,
              },
            },
            ...cssRules,
            {
              test: /\.(graphql|gql)$/,
              exclude: /node_modules/,
              loader: 'graphql-tag/loader',
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(js|mjs|jsx)$/, /\.html$/, /\.json$/],
              loader: require.resolve('file-loader'),
              options: {
                name: `${STATIC_MEDIA_PATH}/[name].[hash:8].[ext]`,
              },
            },
          ],
        },
        // ** STOP ** Are you adding a new loader?
        // Make sure to add the new loader(s) before the "file" loader.
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: `${STATIC_CHUNKS_PATH}/${extractedCssFilename}.css`,
        chunkFilename: `${STATIC_CHUNKS_PATH}/${extractedCssFilename}.chunk.css`,
        ignoreOrder: true,
      }) as { apply: (compiler: Compiler) => void },
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'development') { ... }. See `./env.ts`.
      new webpack.DefinePlugin(env.stringified),
      // Enable HMR for react components
      dev && !isServer && new webpack.HotModuleReplacementPlugin(),
      dev && !isServer && new ReactRefreshWebpackPlugin(),
      // Even though require.cache is server only we have to clear assets from both compilations
      // This is because the client compilation generates the asset manifest that's used on the server side
      dev && new RequireCacheHotReloaderPlugin(),
      routesManifestPluginInstance,
      !isServer && hasServiceWorker && createWorkboxPlugin({ dev, isServer }),
      // Fix dynamic imports on server bundle
      isServer && new SSRImportPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      dev && new CaseSensitivePathsPlugin(),
      !isServer &&
        useTypescript &&
        new ForkTsCheckerPlugin({
          typescript: {
            typescriptPath,
            mode: 'write-references',
            diagnosticOptions: {
              syntactic: true,
            },
            configFile: paths.appTsConfig,
            configOverwrite: {
              compilerOptions: {
                isolatedModules: true,
                noEmit: true,
                incremental: true,
              },
            },
          },
          async: dev,
          logger: {
            infrastructure: 'silent',
            issues: 'silent',
          },
          formatter: 'codeframe',
        }),
    ].filter(filterBoolean),
  }
}

export default getBaseWebpackConfig
