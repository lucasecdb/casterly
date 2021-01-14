import fs from 'fs'
import { join } from 'path'

import { constants, fileExistsSync } from '@casterly/utils'
import * as config from '@casterly/utils/config'
import { Configuration } from 'webpack'

type WebpackConfigFn = (
  config: Configuration,
  options: { dev: boolean; isServer: boolean }
) => Configuration | undefined

type BabelConfigFn = (
  babelConfig: Record<string, unknown>,
  options: { dev: boolean; isServer: boolean }
) => Record<string, unknown> | undefined

const loadWebpackConfig = () => {
  const dir = fs.realpathSync(process.cwd())

  const file = join(dir, constants.WEBPACK_CONFIG_FILE)

  if (!fileExistsSync(file)) {
    return
  }

  return require(file) as WebpackConfigFn
}

const loadBabelConfig = () => {
  const dir = fs.realpathSync(process.cwd())

  const file = join(dir, constants.WEBPACK_CONFIG_FILE)

  if (!fileExistsSync(file)) {
    return
  }

  return require(file).babelConfig as BabelConfigFn | undefined
}

export = { loadWebpackConfig, loadBabelConfig, ...config }
