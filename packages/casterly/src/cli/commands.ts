import * as fs from 'fs'

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

  const { routeIdToFileMap } = constructRoutesTree(config.appSrc)

  await compiler.buildClient({ mode: 'production', routeIdToFileMap, config })
  await compiler.buildServer({ mode: 'production', routeIdToFileMap, config })
}
