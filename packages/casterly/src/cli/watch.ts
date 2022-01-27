import * as path from 'path'

import type { RollupWatcher, RollupWatcherEvent } from 'rollup'

import * as compiler from '../compiler'
import type { CasterlyConfig } from '../config'
import { constructRoutesTree } from '../routes'

export default async function startWatch(config: CasterlyConfig) {
  process.env.NODE_ENV = 'development'

  const { files } = constructRoutesTree(config.appSrc)

  const routeModules = files.map((file) => path.join('src', file))

  const serverWatcher = (await compiler.buildServer({
    config,
    watch: true,
    mode: 'development',
    routeModules,
  })) as RollupWatcher

  const browserWatcher = (await compiler.buildClient({
    config,
    watch: true,
    mode: 'development',
    routeModules,
  })) as RollupWatcher

  await Promise.all([
    waitForFirstBuild(serverWatcher),
    waitForFirstBuild(browserWatcher),
  ])
}

function waitForFirstBuild(watcher: RollupWatcher) {
  return new Promise<void>((resolve) => {
    const bundleListener = (evt: RollupWatcherEvent) => {
      if (evt.code === 'BUNDLE_END') {
        resolve()
        watcher.removeListener('event', bundleListener)
      }
    }
    watcher.addListener('event', bundleListener)
  })
}
