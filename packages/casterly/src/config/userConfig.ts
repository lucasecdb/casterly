import fs from 'fs'
import { join } from 'path'

import { constants, fileExistsSync, paths } from '@casterly/utils'
import * as config from '@casterly/utils/config'
import { Configuration } from 'webpack'

const resolveConfig = (configName: string) => {
  const possibleConfigs = [
    `.${configName}rc`,
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

export = { loadWebpackConfig, ...config }
