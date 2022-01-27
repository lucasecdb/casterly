import * as fs from 'fs'
import * as path from 'path'

export interface CasterlyConfig {
  appBrowserEntry: string
  appBuildFolder: string
  appDirectory: string
  appPublic: string
  appServerEntry: string
  appSrc: string
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

export function readConfig(appDir: string): CasterlyConfig {
  const appDirectory = appDir

  const resolveApp = createResolveApp(appDirectory)

  // const dotenv = resolveApp('.env')

  // const appPath = resolveApp('.')
  const appPublic = resolveApp('public')
  const appBuildFolder = resolveApp('dist')
  // const appPublicBuildFolder = path.join(appBuildFolder, 'public')
  const appServerEntry = resolveModule(resolveApp, 'src/app-server')
  const appBrowserEntry = resolveModule(resolveApp, 'src/app-browser')
  // const appLoaderRuntime = resolveModule(resolveApp, 'src/loader')
  // const appPackageJson = resolveApp('package.json')
  const appSrc = resolveApp('src')
  // const appTsConfig = resolveApp('tsconfig.json')
  // const appNodeModules = resolveApp('node_modules')

  /*
  const buildNodePath = (basePath: string) => {
    const nodePath: string[] = []
    const splitted = [''].concat(basePath.split(path.sep))

    for (let i = splitted.length - 1; i > 0; i--) {
      nodePath.push(path.join(splitted.join(path.sep), 'node_modules'))
      splitted.pop()
    }

    return nodePath
  }

  const appNodePath = buildNodePath(appPath)
  */

  return {
    appBrowserEntry,
    appBuildFolder,
    appDirectory,
    appPublic,
    appServerEntry,
    appSrc,
  }
}
