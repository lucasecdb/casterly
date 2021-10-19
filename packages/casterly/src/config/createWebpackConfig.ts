import path from 'path'

import { constants, fileExists } from '@casterly/utils'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
// @ts-ignore: typings not up-to-date
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import chalk from 'chalk'
// @ts-ignore
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import semver from 'semver'
import type { Compiler, Configuration, ExternalsPlugin } from 'webpack'
import webpack from 'webpack'

import { warn } from '../output/log'
import * as Log from '../output/log'
import { getDependencyVersion } from '../utils/dependencies'
import { filterBoolean } from '../utils/filterBoolean'
import {
  STATIC_ASSETS_PATH,
  STATIC_CHUNKS_PATH,
  STATIC_ENTRYPOINTS_ROUTES,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_LOADER,
  STATIC_RUNTIME_MAIN,
  STATIC_WEBPACK_PATH,
} from './constants'
import getClientEnvironment from './env'
import paths from './paths'
import userConfig from './userConfig'
import { createOptimizationConfig } from './webpack/optimization'
import {
  CHILD_COMPILER_NAME,
  RoutesManifestPlugin,
} from './webpack/plugins/RoutesManifestPlugin'
import SSRImportPlugin from './webpack/plugins/SSRImportPlugin'
import {
  cssModuleRegex,
  cssRegex,
  getStyleLoaders,
  sassModuleRegex,
  sassRegex,
} from './webpack/styles'
import type { Options } from './webpack/types'

const WEBPACK_RESOLVE_OPTIONS = {
  dependencyType: 'commonjs',
  symlinks: true,
}

const WEBPACK_ESM_RESOLVE_OPTIONS = {
  dependencyType: 'esm',
  symlinks: true,
}

const NODE_RESOLVE_OPTIONS = {
  dependencyType: 'commonjs',
  modules: ['node_modules'],
  alias: false,
  fallback: false,
  exportsFields: ['exports'],
  importsFields: ['imports'],
  conditionNames: ['node', 'require', 'module'],
  descriptionFiles: ['package.json'],
  extensions: ['.js', '.json', '.node'],
  enforceExtensions: false,
  symlinks: true,
  mainFields: ['main'],
  mainFiles: ['index'],
  roots: [],
  fullySpecified: false,
  preferRelative: false,
  preferAbsolute: false,
  restrictions: [],
}

const NODE_ESM_RESOLVE_OPTIONS = {
  ...NODE_RESOLVE_OPTIONS,
  dependencyType: 'esm',
  conditionNames: ['node', 'import', 'module'],
  fullySpecified: true,
}

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

const not =
  <T>(fn: (...args: T[]) => boolean) =>
  (...args: T[]) =>
    !fn(...args)

const isRouteManifestChildCompiler = (name: string) =>
  name === CHILD_COMPILER_NAME

const getBaseWebpackConfig = async (
  options?: Options
): Promise<Configuration> => {
  const {
    isServer = false,
    dev = false,
    profile = false,
    configFn,
  } = options ?? {}

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
      test: cssRegex,
      exclude: [cssModuleRegex],
      use: cssConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: cssModuleRegex,
      exclude: [/node_modules/],
      use: cssModuleConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: sassRegex,
      exclude: [sassModuleRegex],
      use: sassConfig,
      compiler: not(isRouteManifestChildCompiler),
    },
    {
      test: sassModuleRegex,
      exclude: [/node_modules/],
      use: sassModuleConfig,
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

  const esbuildForDependencies =
    userConfig.userConfig.experiments?.esbuildDependencies ??
    userConfig.defaultConfig.experiments.esbuildDependencies

  const chunkFilename = dev ? '[name]' : '[name].[contenthash]'
  const extractedCssFilename = dev ? '[name]' : '[name].[contenthash:8]'

  const esmExternals = !!(
    userConfig.userConfig.experiments?.esmExternals ??
    userConfig.defaultConfig.experiments.esmExternals
  )
  const looseEsmExternals =
    (userConfig.userConfig.experiments?.esmExternals ??
      userConfig.defaultConfig.experiments.esmExternals) === 'loose'

  const handleExternals = async (
    getResolve: (
      options: any
    ) => (
      resolveContext: string,
      resolveRequest: string
    ) => Promise<[string | null, boolean]>,
    context?: string,
    request?: string,
    dependencyType?: string
  ) => {
    if (!context || !request || !dependencyType) {
      return
    }

    const isLocal: boolean =
      request.startsWith('.') ||
      // Always check for unix-style path, as webpack sometimes
      // normalizes as posix.
      path.posix.isAbsolute(request) ||
      // When on Windows, we also want to check for Windows-specific
      // absolute paths.
      (process.platform === 'win32' && path.win32.isAbsolute(request))

    if (!isLocal) {
      if (
        /^(?:(?:react-router|react-router-dom)|react(?:$|\/))/.test(request)
      ) {
        return `commonjs ${request}`
      }

      const notExternalModules = /^(?:string-hash$)/

      if (notExternalModules.test(request)) {
        return
      }
    }

    const isEsmRequested = dependencyType === 'esm'
    const preferEsm = isEsmRequested && esmExternals

    const resolve = getResolve(
      preferEsm ? WEBPACK_ESM_RESOLVE_OPTIONS : WEBPACK_RESOLVE_OPTIONS
    )

    let res: string | null
    let isEsm = false

    try {
      // Resolve the import with the webpack provided context, this
      // ensures we're resolving the correct version when multiple
      // exist.
      ;[res, isEsm] = await resolve(context, request)
    } catch (_) {
      res = null
    }

    // Same as above, if the request cannot be resolved we need to have
    // webpack "bundle" it so it surfaces the not found error.
    if (!res && (isEsmRequested || looseEsmExternals)) {
      const resolveAlternative = getResolve(
        preferEsm ? WEBPACK_RESOLVE_OPTIONS : WEBPACK_ESM_RESOLVE_OPTIONS
      )

      try {
        ;[res, isEsm] = await resolveAlternative(context, request)
      } catch {
        res = null
      }
    }

    if (!res) {
      return
    }

    if (!isEsmRequested && isEsm && !looseEsmExternals) {
      throw new Error(`ESM packages (${request}) needs to be imported.`)
    }

    // Bundled Node.js code is relocated without its node_modules tree.
    // This means we need to make sure its request resolves to the same
    // package that'll be available at runtime. If it's not identical,
    // we need to bundle the code (even if it _should_ be external).
    let baseRes: string | null
    let baseIsEsm: boolean
    try {
      const baseResolve = getResolve(
        isEsm ? NODE_ESM_RESOLVE_OPTIONS : NODE_RESOLVE_OPTIONS
      )
      ;[baseRes, baseIsEsm] = await baseResolve(dir, request)
    } catch (_) {
      baseRes = null
      baseIsEsm = false
    }

    // Same as above: if the package, when required from the root,
    // would be different from what the real resolution would use, we
    // cannot externalize it.
    if (baseRes !== res && isEsm !== baseIsEsm) {
      return
    }

    const externalType = isEsm ? 'module' : 'commonjs'

    if (res.match(/casterly[/\\]lib[/\\]/)) {
      return
    }

    // Webpack itself has to be compiled because it doesn't always use module relative paths
    if (
      res.match(/node_modules[/\\]webpack/) ||
      res.match(/node_modules[/\\]css-loader/)
    ) {
      return
    }

    // Anything else that is standard JavaScript within `node_modules`
    // can be externalized.
    if (res.match(/node_modules[/\\].*\.js$/)) {
      return `${externalType} ${request}`
    }

    // Default behavior: bundle the code!
    return
  }

  const externals: ExternalsPlugin['externals'] | undefined = isServer
    ? [
        ({
          context = '',
          request = '',
          dependencyType = '',
          getResolve,
        }: {
          context?: string
          request?: string
          dependencyType?: string
          getResolve?: (
            options: any
          ) => (
            context: string,
            request: string,
            callback: (err?: Error, result?: string, resolveData?: any) => void
          ) => void
        }) =>
          handleExternals(
            (options) => {
              const resolveFunction = getResolve?.(options)
              return (resolveContext: string, requestToResolve: string) =>
                new Promise((resolve, reject) => {
                  resolveFunction?.(
                    resolveContext,
                    requestToResolve,
                    (err, result, resolveData) => {
                      if (err) return reject(err)
                      if (!result) return resolve([null, false])
                      const isEsm = /\.js$/i.test(result)
                        ? resolveData?.descriptionFileData?.type === 'module'
                        : /\.mjs$/i.test(result)
                      resolve([result, isEsm])
                    }
                  )
                })
            },
            context,
            request,
            dependencyType
          ),
      ]
    : undefined

  const entrypoints = {
    [STATIC_ENTRYPOINTS_ROUTES]: paths.appRoutesJs,
    ...(isServer && userConfig.userConfig.loaderRuntime
      ? { [STATIC_RUNTIME_LOADER]: userConfig.userConfig.loaderRuntime }
      : {}),
  }

  const serverEntry = (await fileExists(paths.appServerEntry))
    ? paths.appServerEntry
    : paths.serverDefaultAppServer
  const browserEntry = (await fileExists(paths.appBrowserEntry))
    ? paths.appBrowserEntry
    : paths.serverDefaultAppBrowser

  const appSrcFiles = [paths.appSrc, serverEntry, browserEntry]

  const webpackConfigPath = path.join(
    paths.appPath,
    constants.WEBPACK_CONFIG_FILE
  )
  const hasCustomWebpackConfig = await fileExists(webpackConfigPath)

  let config: Configuration = {
    mode: webpackMode,
    name: isServer ? 'server' : 'client',
    target: isServer ? 'node12.17' : ['web', 'es6'],
    devtool: dev ? 'eval-source-map' : !isServer ? 'source-map' : false,
    bail: webpackMode === 'production',
    context: paths.appPath,
    externals,
    cache: dev
      ? {
          type: 'filesystem',
          allowCollectingMemory: true,
          cacheDirectory: path.join(paths.appBuildFolder, 'cache'),
          buildDependencies: {
            config: [
              __filename,
              hasCustomWebpackConfig &&
                path.join(paths.appPath, constants.WEBPACK_CONFIG_FILE),
            ].filter(filterBoolean),
          },
          version: isServer ? 'server' : 'client',
        }
      : false,
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
        '**/' +
          (userConfig.userConfig.buildFolder ??
            userConfig.defaultConfig.buildFolder) +
          '/**',
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
      conditionNames: ['node', 'import', 'require'],
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
        react: path.join(paths.appNodeModules, 'react'),
        'react-dom': path.join(paths.appNodeModules, 'react-dom'),
        'react-router': path.join(paths.appNodeModules, 'react-router'),
        'react-router-dom': path.join(paths.appNodeModules, 'react-router-dom'),
        ...(!isServer && !dev && profile
          ? {
              'react-dom$': 'react-dom/profiling',
              'scheduler/tracing': 'scheduler/tracing-profiling',
            }
          : null),

        ...(userConfig.userConfig.loaderRuntime && !isServer
          ? {
              'private-casterly-loader$': userConfig.userConfig.loaderRuntime,
            }
          : {}),
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
          use: [
            !esbuildForDependencies && {
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
            esbuildForDependencies && {
              loader: require.resolve('esbuild-loader'),
              options: {},
            },
          ].filter(filterBoolean),
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
        experimentalUseImportModule: true,
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
