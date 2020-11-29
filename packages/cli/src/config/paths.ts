import * as fs from 'fs'
import * as path from 'path'

import { defaultConfig, userConfig } from './userConfig'

const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = (relativePath: string) =>
  path.resolve(appDirectory, relativePath)

const serverDirectory = path.resolve(__dirname, '..')
const resolveServer = (relativePath: string) =>
  path.resolve(serverDirectory, relativePath)

export const moduleFileExtensions = ['mjs', 'js', 'json', 'jsx']

export const typescriptFileExtensions = ['ts', 'tsx']

// Resolve file paths in the same order as webpack
export const resolveModule = (resolveFn = resolveApp, filePath: string) => {
  const extension = [
    ...moduleFileExtensions,
    ...typescriptFileExtensions,
  ].find((extension) => fs.existsSync(resolveFn(`${filePath}.${extension}`)))

  if (extension) {
    return resolveFn(`${filePath}.${extension}`)
  }

  return resolveFn(`${filePath}.js`)
}

export const dotenv = resolveApp('.env')

export const appPath = resolveApp('.')
export const appBuildFolder = resolveApp(
  userConfig.buildFolder ?? defaultConfig.buildFolder
)
export const appServerBuildFolder = path.join(appBuildFolder, 'server')
export const appPublicBuildFolder = path.join(appBuildFolder, 'public')
export const appPublic = resolveApp('public')
export const appServerEntry = resolveModule(resolveApp, 'app-server')
export const appBrowserEntry = resolveModule(resolveApp, 'app-browser')
export const appRoutesJs = resolveModule(resolveApp, 'src/routes')
export const appServiceWorker = resolveModule(resolveApp, 'src/serviceWorker')
export const appPackageJson = resolveApp('package.json')
export const appSrc = resolveApp('src')
export const appTsConfig = resolveApp('tsconfig.json')
export const appNodeModules = resolveApp('node_modules')

const buildNodePath = (basePath: string) => {
  const nodePath: string[] = []
  const splitted = [''].concat(basePath.split(path.sep))

  for (let i = splitted.length - 1; i > 0; i--) {
    nodePath.push(path.join(splitted.join(path.sep), 'node_modules'))
    splitted.pop()
  }

  return nodePath
}

export const appNodePath = buildNodePath(appPath)

export const serverPath = resolveServer('.')
export const serverClientHot = resolveServer('client/hot.js')
