import chalk from 'chalk'
import prettyMs from 'pretty-ms'
import type { RollupWatcher, RollupWatcherEvent } from 'rollup'

import * as compiler from '../compiler'
import type { CasterlyConfig } from '../config'

export default async function startWatch(config: CasterlyConfig) {
  process.env.NODE_ENV = 'development'

  console.log(chalk`{dim casterly}  {magenta wait} Starting build`)

  const browserWatcher = (await compiler.buildClient({
    config,
    watch: true,
    mode: 'development',
  })) as RollupWatcher

  const browserResult = await Promise.allSettled([
    waitForFirstBuild(browserWatcher),
  ])

  const serverWatcher = (await compiler.buildServer({
    config,
    watch: true,
    mode: 'development',
  })) as RollupWatcher

  const serverResult = await Promise.allSettled([
    waitForFirstBuild(serverWatcher),
  ])

  const settleResult = browserResult.concat(serverResult)

  const buildSuccess = settleResult.every(
    (result) => result.status === 'fulfilled'
  )

  if (buildSuccess) {
    const duration = Math.max(
      ...settleResult.map((result) =>
        result.status === 'fulfilled' ? result.value : 0
      )
    )

    console.log(
      chalk`{dim casterly} {green ready} Compiled successfully in ${prettyMs(
        duration
      )}`
    )
  } else {
    console.error(chalk`{dim casterly} {red error} Build failed`)

    const errorResult = settleResult.find(
      (result) => result.status === 'rejected'
    ) as PromiseRejectedResult

    const err = errorResult.reason as Error

    console.error(`  ${err.message}`)
  }

  browserWatcher.addListener('event', (event) => {
    if (event.code === 'START') {
      console.log(
        chalk`{dim casterly}  {magenta wait} Files changed, building...`
      )
    } else if (event.code === 'BUNDLE_END') {
      console.log(
        chalk`{dim casterly} {green ready} Rebuilt successfully in ${prettyMs(
          event.duration
        )}`
      )
    } else if (event.code === 'ERROR') {
      console.error(chalk`{dim casterly} {red error} Rebuild failed`)

      console.error(`  ${event.error.message}`)
    }
  })
}

function waitForFirstBuild(watcher: RollupWatcher) {
  return new Promise<number>((resolve, reject) => {
    const bundleListener = (evt: RollupWatcherEvent) => {
      if (evt.code === 'BUNDLE_END') {
        resolve(evt.duration)
        watcher.removeListener('event', bundleListener)
      }

      if (evt.code === 'ERROR') {
        reject(evt.error)
      }
    }
    watcher.addListener('event', bundleListener)
  })
}
