// Ensure environment variables are read.
import '../config/env'

import { join } from 'path'

import * as fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { build as buildVite } from 'vite'

import { checkRequiredFiles, printBuildError } from '../build/utils'
import { BUILD_ID_FILE } from '../config/constants'
import paths from '../config/paths'
import { viteConfig } from '../config/viteConfig'
import * as Log from '../output/log'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err
})

// Create the production build and print the deployment instructions.
async function build(previousFileSizes: {
  root: string
  sizes: Record<string, number>
}) {
  Log.info('Creating an optimized production build...')

  await buildVite(viteConfig)

  return {
    previousFileSizes,
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
  // Warn and crash if required files are missing
  if (!checkRequiredFiles([paths.appRoutesJs])) {
    process.exit(1)
  }

  // First, read the current file sizes in build directory.
  // This lets us display how much they changed later.
  Promise.resolve(paths.appBuildFolder)
    .then((previousFileSizes: any) => {
      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(paths.appBuildFolder)
      // Merge with the public folder
      copyPublicFolder()
      // Start the webpack build
      return build(previousFileSizes)
    })
    .then(
      () => {
        Log.ready('Compiled successfully.\n')

        const buildId = nanoid()

        fs.writeFileSync(join(paths.appBuildFolder, BUILD_ID_FILE), buildId)
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
