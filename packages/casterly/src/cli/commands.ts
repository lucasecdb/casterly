import * as fs from 'fs'
import path from 'path'

import * as compiler from '../compiler'
import { readConfig } from '../config'
import { constructRoutesTree } from '../routes'
import startWatch from './watch'

export async function watch() {
  const config = readConfig(fs.realpathSync(process.cwd()))

  await startWatch(config)
}

export async function build() {
  const config = readConfig(fs.realpathSync(process.cwd()))

  const { files } = constructRoutesTree(config.appSrc)

  const routeModules = files.map((filePath) => path.join('src', filePath))

  await Promise.all([
    compiler.buildClient({ mode: 'production', routeModules, config }),
    compiler.buildServer({ mode: 'production', routeModules, config }),
  ])
}
