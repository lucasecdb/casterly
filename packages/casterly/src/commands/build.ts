// Ensure environment variables are read.
import '../config/env'

import { join } from 'path'
import * as util from 'util'

import bfj from 'bfj'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { webpack } from 'webpack'

import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from '../build/fileSizeReporter'
import { formatWebpackMessages } from '../build/formatWebpackMessages'
import { checkRequiredFiles, printBuildError } from '../build/utils'
import { BUILD_ID_FILE } from '../config/constants'
import getBaseWebpackConfig from '../config/createWebpackConfig'
import paths from '../config/paths'
import config from '../config/userConfig'
import * as Log from '../output/log'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err
})

// Create the production build and print the deployment instructions.
async function build(
  previousFileSizes: { root: string; sizes: Record<string, number> },
  writeStatsJson = false,
  profile = false
) {
  Log.info('Creating an optimized production build...')

  const webpackConfigFn = config.loadWebpackConfig()

  const compiler = webpack([
    await getBaseWebpackConfig({
      profile,
      configFn: webpackConfigFn,
    }),
    await getBaseWebpackConfig({
      isServer: true,
      profile,
      configFn: webpackConfigFn,
    }),
  ])

  const run = util.promisify(compiler.run)

  let multiStats: ReturnType<typeof run> extends Promise<infer U> ? U : never
  let messages

  try {
    multiStats = await run.call(compiler)

    messages = formatWebpackMessages(
      multiStats?.toJson({ all: false, warnings: true, errors: true })
    )
  } catch (err) {
    if (!(err as Error).message) {
      throw err
    }

    messages = formatWebpackMessages({
      errors: [{ message: (err as Error).message }],
      warnings: [],
    })
  }
  if (messages.errors.length) {
    // Only keep the first error. Others are often indicative
    // of the same problem, but confuse the reader with noise.
    if (messages.errors.length > 1) {
      messages.errors.length = 1
    }
    throw new Error(messages.errors.join('\n\n'))
  }
  if (
    process.env.CI &&
    (typeof process.env.CI !== 'string' ||
      process.env.CI.toLowerCase() !== 'false') &&
    messages.warnings.length
  ) {
    Log.warn(
      chalk.yellow(
        '\nTreating warnings as errors because process.env.CI = true.\n' +
          'Most CI servers set it automatically.\n'
      )
    )
    throw new Error(messages.warnings.join('\n\n'))
  }

  if (writeStatsJson) {
    await bfj.write(
      paths.appBuildFolder + '/bundle-stats.json',
      multiStats?.toJson()
    )
  }

  return {
    stats: multiStats!,
    previousFileSizes,
    warnings: messages.warnings,
  }
}

function copyPublicFolder() {
  if (!fs.existsSync(paths.appPublic)) {
    return
  }

  fs.copySync(paths.appPublic, paths.appPublicBuildFolder, {
    dereference: true,
  })
}

export default function startBuild() {
  // These sizes are pretty large. We'll warn for bundles exceeding them.
  const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
  const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

  // Warn and crash if required files are missing
  if (!checkRequiredFiles([paths.appRoutesJs])) {
    process.exit(1)
  }

  // Process CLI arguments
  const argv = process.argv.slice(3)
  const writeStatsJson = argv.indexOf('--stats') !== -1
  const profile = argv.indexOf('--profile') !== -1

  // First, read the current file sizes in build directory.
  // This lets us display how much they changed later.
  measureFileSizesBeforeBuild(paths.appBuildFolder)
    .then((previousFileSizes) => {
      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(paths.appBuildFolder)
      // Merge with the public folder
      copyPublicFolder()
      // Start the webpack build
      return build(previousFileSizes, writeStatsJson, profile)
    })
    .then(
      ({ stats, previousFileSizes, warnings }) => {
        if (warnings.length) {
          Log.warn(chalk.yellow('Compiled with warnings.\n'))
          console.log(warnings.join('\n\n'))
          console.log(
            '\nSearch for the ' +
              chalk.underline(chalk.yellow('keywords')) +
              ' to learn more about each warning.'
          )
          console.log(
            'To ignore, add ' +
              chalk.cyan('// eslint-disable-next-line') +
              ' to the line before.\n'
          )
        } else {
          Log.ready('Compiled successfully.\n')
        }

        const buildId = nanoid()

        fs.writeFileSync(join(paths.appBuildFolder, BUILD_ID_FILE), buildId)

        const [clientStats] = stats.stats

        console.log('File sizes after gzip:\n')
        printFileSizesAfterBuild(
          clientStats,
          previousFileSizes,
          paths.appBuildFolder,
          WARN_AFTER_BUNDLE_GZIP_SIZE,
          WARN_AFTER_CHUNK_GZIP_SIZE
        )
      },
      (err: Error) => {
        Log.error('Failed to compile.\n')
        printBuildError(err)
        process.exit(1)
      }
    )
    .catch((err: Error) => {
      if (err?.message) {
        console.log(err.message)
      }
      process.exit(1)
    })
}
