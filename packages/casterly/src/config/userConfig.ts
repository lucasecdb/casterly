import fs from 'fs'
import { join } from 'path'

import { constants, fileExistsSync } from '@casterly/utils'
import * as config from '@casterly/utils/config'
import { Configuration } from 'webpack'

type WebpackConfigFn = (
  config: Configuration,
  options: { dev: boolean; isServer: boolean }
) => Configuration | undefined

const loadWebpackConfig = () => {
  const dir = fs.realpathSync(process.cwd())

  const file = join(dir, constants.WEBPACK_CONFIG_FILE)

  if (!fileExistsSync(file)) {
    return
  }

  return require(file) as WebpackConfigFn
}

export = { loadWebpackConfig, ...config }
