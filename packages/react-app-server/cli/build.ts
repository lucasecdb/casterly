// Ensure environment variables are read.
import '../config/env'

import util from 'util'

import bfj from 'bfj'
import chalk from 'chalk'
import fs from 'fs-extra'
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages'
import webpack, { MultiCompiler } from 'webpack'

import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from '../build/fileSizeReporter'
import { checkRequiredFiles, printBuildError } from '../build/utils'
import getBaseWebpackConfig from '../config/createWebpackConfig'
import * as paths from '../config/paths'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err
})

// Create the production build and print the deployment instructions.
async function build(
  previousFileSizes: { root: string; sizes: Record<string, number> },
  writeStatsJson = false
) {
  console.log('Creating an optimized production build...')

  const compiler: MultiCompiler = webpack([
    await getBaseWebpackConfig(),
    await getBaseWebpackConfig({ isServer: true }),
  ])

  const run = util.promisify(compiler.run)

  let stats: ReturnType<typeof run> extends Promise<infer U> ? U : never
  let messages

  try {
    stats = await run.call(compiler)
    messages = formatWebpackMessages(
      // @ts-ignore
      stats.toJson({ all: false, warnings: true, errors: true })
    )
  } catch (err) {
    if (!err.message) {
      throw err
    }
    messages = formatWebpackMessages({
      _showErrors: true,
      _showWarnings: true,
      errors: [err.message],
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
    console.log(
      chalk.yellow(
        '\nTreating warnings as errors because process.env.CI = true.\n' +
          'Most CI servers set it automatically.\n'
      )
    )
    throw new Error(messages.warnings.join('\n\n'))
  }

  if (writeStatsJson) {
    await bfj.write(paths.appDist + '/bundle-stats.json', stats?.toJson())
  }

  return {
    stats: stats!,
    previousFileSizes,
    warnings: messages.warnings,
  }
}

function copyPublicFolder() {
  if (!fs.existsSync(paths.appPublic)) {
    return
  }

  fs.copySync(paths.appPublic, paths.appDistPublic, {
    dereference: true,
  })
}

export default function startBuild() {
  // These sizes are pretty large. We'll warn for bundles exceeding them.
  const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
  const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

  // Warn and crash if required files are missing
  if (!checkRequiredFiles([paths.appIndexJs])) {
    process.exit(1)
  }

  // Process CLI arguments
  const argv = process.argv.slice(3)
  const writeStatsJson = argv.indexOf('--stats') !== -1

  // First, read the current file sizes in build directory.
  // This lets us display how much they changed later.
  measureFileSizesBeforeBuild(paths.appDist)
    .then((previousFileSizes) => {
      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(paths.appDist)
      // Merge with the public folder
      copyPublicFolder()
      // Start the webpack build
      return build(previousFileSizes, writeStatsJson)
    })
    .then(
      ({ stats, previousFileSizes, warnings }) => {
        if (warnings.length) {
          console.log(chalk.yellow('Compiled with warnings.\n'))
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
          console.log(chalk.green('Compiled successfully.\n'))
        }

        const [clientStats] = stats.stats

        console.log('File sizes after gzip:\n')
        printFileSizesAfterBuild(
          clientStats,
          previousFileSizes,
          paths.appDist,
          WARN_AFTER_BUNDLE_GZIP_SIZE,
          WARN_AFTER_CHUNK_GZIP_SIZE
        )
      },
      (err: Error) => {
        console.log(chalk.red('Failed to compile.\n'))
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
