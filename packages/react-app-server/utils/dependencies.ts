import { promises as fsp } from 'fs'
import * as path from 'path'

import fileExists from './fileExists'
import resolveRequest from './resolveRequest'

const PACKAGE_JSON = 'package.json'

export const getPackageJson = async (baseDir: string) => {
  if (!(await fileExists(path.join(baseDir, PACKAGE_JSON)))) {
    return null
  }

  const packageJson = await fsp.readFile(path.join(baseDir, PACKAGE_JSON))

  return JSON.parse(packageJson.toString())
}

export const getDependencyVersion = async (
  baseDir: string,
  dependencyName: string
) => {
  const packageJson = await getPackageJson(baseDir)

  if (!packageJson) {
    return null
  }

  const dependency =
    packageJson.dependencies[dependencyName] ??
    packageJson.devDependencies[dependencyName]

  if (!dependency) {
    return null
  }

  const cwd =
    baseDir.endsWith(path.posix.sep) || baseDir.endsWith(path.win32.sep)
      ? baseDir
      : `${baseDir}/`

  try {
    const target = resolveRequest(`${dependencyName}/package.json`, cwd)
    const dependencyPackageJson = await fsp.readFile(target, 'utf-8')
    return JSON.parse(dependencyPackageJson.toString()).version
  } catch {
    return null
  }
}
