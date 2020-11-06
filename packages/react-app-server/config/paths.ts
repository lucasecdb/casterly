import * as fs from 'fs'
import * as path from 'path'

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
export const appDist = resolveApp('.dist')
export const appDistServer = path.join(appDist, 'server')
export const appDistPublic = path.join(appDist, 'public')
export const appPublic = resolveApp('public')
export const appIndexJs = resolveModule(resolveApp, 'src/index')
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
export const serverServerEntry = resolveServer('entries/server')
export const serverBrowserEntry = resolveServer('entries/browser')
