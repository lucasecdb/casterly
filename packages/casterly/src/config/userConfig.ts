import fs from 'fs'
import { join } from 'path'

import { constants, fileExistsSync, paths } from '@casterly/utils'
import * as config from '@casterly/utils/config'
import JSON5 from 'json5'
import type { Configuration } from 'webpack'

const resolveConfigPath = (configName: string) => {
  const possibleConfigs = [
    `.${configName}rc.js`,
    `.${configName}rc.json`,
    `${configName}.config.js`,
    `${configName}.config.json`,
  ]

  for (const possibleConfigPath of possibleConfigs) {
    const absoluteConfigPath = join(paths.appDirectory, possibleConfigPath)
    if (fs.existsSync(absoluteConfigPath)) {
      return absoluteConfigPath
    }
  }

  return undefined
}

type WebpackConfigFn = (
  config: Configuration,
  options: { dev: boolean; isServer: boolean }
) => Configuration | undefined

const loadWebpackConfig = () => {
  const file = join(paths.appDirectory, constants.WEBPACK_CONFIG_FILE)

  if (!fileExistsSync(file)) {
    return
  }

  return require(file) as WebpackConfigFn
}

const loadConfig = <T>(configName: string) => {
  const filePath = resolveConfigPath(configName)

  if (filePath == null) {
    return null
  }

  if (filePath.endsWith('js')) {
    return require(filePath) as T
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON5.parse(fileContents) as T
}

const postcssRc = loadConfig<{ plugins: any[] }>('postcss')

export = { loadWebpackConfig, postcssRc, ...config }
