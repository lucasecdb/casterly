import { realpathSync } from 'fs'
import path from 'path'

import { fileExists } from '@casterly/utils'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
// @ts-ignore: typings not up-to-date
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import chalk from 'chalk'
import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin'
// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import semver from 'semver'
import type { Compiler, Configuration, ExternalsPlugin } from 'webpack'
import webpack from 'webpack'

import { warn } from '../output/log'
import * as Log from '../output/log'
import { getDependencyVersion } from '../utils/dependencies'
import { filterBoolean } from '../utils/filterBoolean'
import resolveRequest from '../utils/resolveRequest'
import {
  STATIC_ASSETS_PATH,
  STATIC_CHUNKS_PATH,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_WEBPACK_PATH,
} from './constants'
import getClientEnvironment from './env'
import paths from './paths'
import userConfig from './userConfig'
import { createOptimizationConfig } from './webpack/optimization'
import SSRImportPlugin from './webpack/plugins/SSRImportPlugin'
import {
  CHILD_COMPILER_NAME,
  RoutesManifestPlugin,
} from './webpack/plugins/routes/RoutesManifestPlugin'
import {
  cssGlobalRegex,
  cssRegex,
  getStyleLoaders,
  sassGlobalRegex,
  sassRegex,
} from './webpack/styles'
import type { Options } from './webpack/types'

const loadPostcssPlugins = async (dir: string) => {
  const postcssRc = userConfig.postcssRc

  if (postcssRc == null) {
    return [
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
    ]
  }

  if (Object.keys(postcssRc).some((key) => key !== 'plugins')) {
    Log.warn(
      'You PostCSS configuration export unknown attributes.' +
        ' Please remove the following fields to suppress this' +
        ' warning: ' +
        Object.keys(postcssRc)
          .filter((key) => key !== 'plugins')
          .join(', ')
    )
  }

  let plugins = postcssRc.plugins

  if (!Array.isArray(plugins)) {
    const pluginsObject = plugins

    plugins = Object.keys(plugins).reduce((acc, pluginName) => {
      const pluginOptions = pluginsObject[pluginName]

      if (typeof pluginOptions === 'undefined') {
        throw new Error(
          `Your PostCSS configuration is invalid, the configuration for the plugin ${pluginName} must not be undefined.`
        )
      }

      acc.push([pluginName, pluginOptions])
      return acc
    }, [] as Array<[string, Record<string, unknown>]>)
  }

  plugins = plugins
    .map((plugin) => {
      if (plugin == null) {
        Log.warn(
          chalk`A {yellow null} PostCSS plugin was provided. This entry will be ignored.`
        )
        return false
      }

      if (typeof plugin === 'string') {
        return [plugin, true]
      }

      if (Array.isArray(plugin)) {
        const [pluginName, pluginConfig] = plugin

        if (
          typeof pluginName === 'string' &&
          (typeof pluginConfig === 'boolean' ||
            typeof pluginConfig === 'object')
        ) {
          return [pluginName, pluginConfig]
        }
        if (typeof pluginName !== 'string') {
          Log.error(
            chalk`A PostCSS plugin must be provided as a {bold 'string'}. Instead we got: '${pluginName}'.`
          )
        } else {
          Log.error(
            chalk`A PostCSS plugin was passed as an array but did not provide it's configuration object ('${pluginName}').`
          )
        }
        return false
      }

      if (typeof plugin === 'function') {
        Log.error(
          chalk`A PostCSS plugin was passed as a function using require(), but it must be provided as a {bold string}.`
        )
        return false
      }

      Log.error(chalk`An unknown PostCSS plugin was provided (${plugin}).`)

      return false
    })
    .filter(<T>(value: T | false): value is T => value !== false)
    .map(([pluginName, pluginConfig]) => {
      const resolvedPluginPath = require.resolve(pluginName, { paths: [dir] })

      return [resolvedPluginPath, pluginConfig]
    })

  const resolvedPlugins = await Promise.all(
    plugins.map(([plugin, options]) => {
      if (options === false) {
        return false
      }

      if (options == null) {
        throw new Error(
          chalk`A {chalk null} PostCSS plugin option was provided (${plugin}).`
        )
      }

      if (options === true) {
        return require(plugin)
      }

      const keys = Object.keys(options)

      if (keys.length === 0) {
        return require(plugin)
      }

      return require(plugin)(options)
    })
  )

  return resolvedPlugins.filter(
    <T>(plugin: T | false): plugin is T => plugin !== false
  )
}

const not = <T>(fn: (...args: T[]) => boolean) => (...args: T[]) => !fn(...args)

const isRouteManifestChildCompiler = (name: string) =>
  name === CHILD_COMPILER_NAME

const getBaseWebpackConfig = async (
  options?: Options
): Promise<Configuration> => {
  const { isServer = false, dev = false, profile = false, configFn } =
    options ?? {}

  // Get environment variables to inject into our app.
  const env = getClientEnvironment({ isServer })

  const sassLoaderConfig = {
    loader: require.resolve('sass-loader'),
    options: {
      implementation: require('sass'),
      sassOptions: {
        fiber: require('fibers'),
      },
    },
  }

  const postcssPlugins = await loadPostcssPlugins(paths.appPath)

  const cssConfig = getStyleLoaders({ dev, isServer, postcssPlugins })
  const cssModuleConfig = getStyleLoaders({
    dev,
    isServer,
    cssModules: true,
    postcssPlugins,
  })
  const sassConfig = getStyleLoaders({
    dev,
    isServer,
    loaders: [sassLoaderConfig],
    postcssPlugins,
  })
  const sassModuleConfig = getStyleLoaders({
    dev,
    isServer,
    cssModules: true,
    loaders: [sassLoaderConfig],
    postcssPlugins,
  })

  const cssRules = [
    {
      test: cssGlobalRegex,
      use: cssConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: cssRegex,
      exclude: [cssGlobalRegex, /node_modules/],
      use: cssModuleConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: cssRegex,
      include: [{ not: [paths.appSrc] }],
      use: cssConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: sassGlobalRegex,
      use: sassConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: sassRegex,
      exclude: [sassGlobalRegex, /node_modules/],
      use: sassModuleConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: sassRegex,
      include: [{ not: [paths.appSrc] }],
      use: sassConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: [sassRegex, cssRegex],
      use: ['ignore-loader'],
      compiler: isRouteManifestChildCompiler,
    },
  ]

  const routesManifestPluginInstance = !isServer
    ? new RoutesManifestPlugin()
    : null

  const dir = paths.appBuildFolder
  const outputDir = isServer ? 'server' : ''
  const outputPath = path.join(dir, outputDir)
  const webpackMode = dev ? 'development' : 'production'

  const reactVersion = await getDependencyVersion('react')
  const hasJsxRuntime =
    reactVersion != null &&
    semver.satisfies(
      semver.coerce(reactVersion) ?? '-1',
      '^16.4.0 || >=17 || ~0.0.0'
    )

  const typescriptPath = require.resolve('typescript', {
    paths: [paths.appNodeModules],
  })

  const useTypescript =
    !!typescriptPath && (await fileExists(paths.appTsConfig))

  const chunkFilename = dev ? '[name]' : '[name].[contenthash]'
  const extractedCssFilename = dev ? '[name]' : '[name].[contenthash:8]'

  const externals: ExternalsPlugin['externals'] | undefined = isServer
    ? [
        ({ context, request }, callback) => {
          const excludedModules: string[] = [
            // add modules that should be transpiled here
          ]

          if (!request || excludedModules.indexOf(request) !== -1) {
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

          if (res.match(/casterly[/\\]lib[/\\]/)) {
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

  const entrypoints = {
    [STATIC_ENTRYPOINTS_ROUTES]: paths.appRoutesJs,
  }

  const serverEntry = (await fileExists(paths.appServerEntry))
    ? paths.appServerEntry
    : paths.serverDefaultAppServer
  const browserEntry = (await fileExists(paths.appBrowserEntry))
    ? paths.appBrowserEntry
    : paths.serverDefaultAppBrowser

  const appSrcFiles = [paths.appSrc, serverEntry, browserEntry]

  let config: Configuration = {
    mode: webpackMode,
    name: isServer ? 'server' : 'client',
    target: isServer ? 'node' : 'web',
    devtool:
      dev && !isServer ? 'eval-source-map' : !isServer ? 'source-map' : false,
    bail: webpackMode === 'production',
    context: paths.appPath,
    externals,
    entry: () => ({
      ...entrypoints,
      ...(!isServer
        ? {
            [STATIC_RUNTIME_MAIN]: browserEntry,
            ...(dev ? { [STATIC_RUNTIME_HOT]: paths.serverClientHot } : null),
          }
        : { [STATIC_RUNTIME_MAIN]: serverEntry }),
    }),
    watchOptions: {
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/' + userConfig.userConfig.buildFolder ??
          userConfig.defaultConfig.buildFolder + '/**',
      ],
    },
    output: {
      publicPath: '/_casterly/',
      path: outputPath,
      filename: isServer
        ? '[name].js'
        : `${STATIC_CHUNKS_PATH}/[name]${dev ? '' : '-[chunkhash]'}.js`,
      chunkFilename: isServer
        ? `${chunkFilename}.js`
        : `${STATIC_CHUNKS_PATH}/${chunkFilename}.js`,
      assetModuleFilename: isServer
        ? '[hash][ext][query]'
        : (pathData) => {
            const ext = pathData.filename
              ?.split('?')[0]
              .match(
                new RegExp(
                  `\\.(${
                    useTypescript
                      ? paths.typescriptFileExtensions.join('|') + '|'
                      : ''
                  }${paths.moduleFileExtensions.join('|')})$`
                )
              )
              ? '.js'
              : '[ext]'

            return `${STATIC_ASSETS_PATH}/[hash]${ext}[query]`
          },
      hotUpdateMainFilename: `${STATIC_WEBPACK_PATH}/[fullhash].hot-update.json`,
      hotUpdateChunkFilename: `${STATIC_WEBPACK_PATH}/[id].[fullhash].hot-update.js`,
      devtoolModuleFilenameTemplate: (info: any) =>
        path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
      library: isServer ? undefined : '_RS',
      libraryTarget: isServer ? 'commonjs2' : 'assign',
    },
    performance: false,
    optimization: createOptimizationConfig({
      dev,
      isServer,
      getNumberOfRoutes: () =>
        routesManifestPluginInstance?.getNumberOfRoutes() ?? 0,
    }),
    resolveLoader: {
      alias: ['custom-babel-loader'].reduce<Record<string, string>>(
        (alias, loader) => {
          // using multiple aliases to replace `resolveLoader.modules`
          alias[loader] = path.join(__dirname, 'webpack', 'loaders', loader)

          return alias
        },
        {}
      ),
    },
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
        {
          test: /\.(tsx|ts|js|mjs|jsx)$/,
          include: appSrcFiles,
          exclude: (excludePath) => /node_modules/.test(excludePath),
          loader: 'custom-babel-loader',
          options: {
            isServer,
            dev,
            hasReactRefresh: dev && !isServer,
            hasJsxRuntime,
          },
        },
        {
          test: /\.(js|mjs)$/,
          include: /node_modules/,
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          loader: require.resolve('babel-loader'),
          options: {
            babelrc: false,
            configFile: false,
            compact: false,

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
      routesManifestPluginInstance,
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
            mode: 'readonly',
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

  if (configFn) {
    const userConfig = configFn(config, { isServer, dev })

    if (typeof userConfig !== 'object' || 'then' in userConfig) {
      warn(
        'Webpack config function expected to return an object,' +
          ` but instead received "${typeof userConfig}".` +
          (typeof userConfig === 'object' && 'then' in userConfig
            ? ' Did you accidentally return a Promise?'
            : '')
      )
    } else {
      config = userConfig
    }
  }

  return config
}

export default getBaseWebpackConfig
