// originally taken from https://github.com/facebook/create-react-app/tree/master/packages/react-dev-utils
import * as fs from 'fs'
import path from 'path'

import chalk from 'chalk'

export function printBuildError(err?: Error) {
  const message = err?.message

  console.log((message ?? err) + '\n')
  console.log()
}

export function checkRequiredFiles(files: string[]) {
  let currentFilePath = ''

  try {
    files.forEach((filePath) => {
      currentFilePath = filePath
      fs.accessSync(filePath, fs.constants.F_OK)
    })

    return true
  } catch {
    const dirName = path.dirname(currentFilePath)
    const fileName = path.basename(currentFilePath)

    console.log(chalk.red('Could not find a required file.'))
    console.log(chalk.red('  Name: ') + chalk.cyan(fileName))
    console.log(chalk.red('  Searched in: ') + chalk.cyan(dirName))

    return false
  }
}
