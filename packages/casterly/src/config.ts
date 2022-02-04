import * as fs from 'fs'
import * as path from 'path'

import type { ConfigRoute } from './routes'
import { constructRoutesTree } from './routes'

export const CONFIG_FILE = 'casterly.config.js'

interface ExperimentsConfig {
  esbuildDependencies: boolean
  esmExternals: boolean | 'loose'
}

export interface CasterlyConfig {
  appBrowserEntry: string
  appBuildFolder: string
  appDirectory: string
  appPublic: string
  appServerEntry: string
  appSrc: string

  devServerPort: number
  buildFolder: string

  experiments: ExperimentsConfig

  /**
   * Map of current app routes, keyed by routeId
   */
  routes: Record<string, ConfigRoute>
}

function createResolveApp(appDirectory: string) {
  return (relativePath: string) => path.resolve(appDirectory, relativePath)
}

const moduleFileExtensions = ['mjs', 'js', 'json', 'jsx']

const typescriptFileExtensions = ['ts', 'tsx']

const resolveModule = (
  resolveFn: (relative: string) => string,
  filePath: string
) => {
  const extension = [...moduleFileExtensions, ...typescriptFileExtensions].find(
    (extension) => fs.existsSync(resolveFn(`${filePath}.${extension}`))
  )

  if (extension) {
    return resolveFn(`${filePath}.${extension}`)
  }

  return resolveFn(`${filePath}.js`)
}

export function readConfig(dir: string): CasterlyConfig {
  const appDirectory = dir

  const resolveApp = createResolveApp(dir)

  const appPublic = resolveApp('public')
  const appBuildFolder = resolveApp('dist')
  const appServerEntry = resolveModule(resolveApp, 'src/app-server')
  const appBrowserEntry = resolveModule(resolveApp, 'src/app-browser')
  const appSrc = resolveApp('src')

  const routes = constructRoutesTree(appSrc)

  const filePath = path.join(dir, CONFIG_FILE)

  const userConfig: CasterlyConfig = {
    appBrowserEntry,
    appBuildFolder,
    appDirectory,
    appPublic,
    appServerEntry,
    appSrc,
    devServerPort: 8081,
    buildFolder: 'dist',
    experiments: {
      esbuildDependencies: false,
      esmExternals: false,
    },
    routes,
  }

  const configFileExists = fileExistsSync(filePath)

  const configFileContent = configFileExists
    ? (require(filePath) as Partial<CasterlyConfig>)
    : undefined

  if (configFileExists && configFileContent == null) {
    console.warn(
      'Nothing was exported from configuration file, either remove it ' +
        'or add some of our configuration options.'
    )
  }

  if (!configFileExists) {
    const configFileBasename = path.basename(
      CONFIG_FILE,
      path.extname(CONFIG_FILE)
    )

    const configWithDifferentExtension = ['.tsx', '.ts', '.jsx', '.json']
      .map((ext) => path.join(dir, configFileBasename + ext))
      .map(fileExistsSync)
      .some(Boolean)

    if (configWithDifferentExtension) {
      console.warn(
        'Config file with unsupported extension found. ' +
          'Please rename the configuration file to ' +
          JSON.stringify(CONFIG_FILE)
      )
    }
  }

  if (configFileContent != null) {
    // TODO: merge configs
  }

  return userConfig
}

function fileExistsSync(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return false
    }

    throw err
  }
}
