import { promises as fsp } from 'fs'
import * as path from 'path'
import { dirname } from 'path'

import { fileExists, paths } from '@casterly/utils'

import resolveRequest from './resolveRequest'

const PACKAGE_JSON = 'package.json'

export const getPackageJson = async (baseDir: string) => {
  if (!(await fileExists(path.join(baseDir, PACKAGE_JSON)))) {
    return null
  }

  const packageJson = await fsp.readFile(path.join(baseDir, PACKAGE_JSON))

  return JSON.parse(packageJson.toString())
}

export const getDependencyVersion = async (dependencyName: string) => {
  const cwd = dirname(
    require.resolve(`${dependencyName}/package.json`, {
      paths: paths.appNodePath,
    })
  )

  try {
    const target = resolveRequest(`${dependencyName}/package.json`, cwd)
    const dependencyPackageJson = await fsp.readFile(target, 'utf-8')
    return JSON.parse(dependencyPackageJson.toString()).version
  } catch {
    return null
  }
}
