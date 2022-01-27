import chalk from 'chalk'

import * as cli from './cli/commands'

const commands: { [command: string]: () => Promise<void> } = {
  dev: async () => {
    console.error(
      chalk`Command {bold dev} has been deprecated. Please use {bold casterly watch}`
    )

    process.exit(1)
  },
  start: async () => {
    console.error(chalk`Command {bold start} has been deprecated.`)

    process.exit(1)
  },
  build: async () => {
    await cli.build()
  },
  watch: async () => {
    await cli.watch()
  },
}

const command = process.argv[2]

const hasCommand = Boolean(commands[command])

if (!hasCommand) {
  // @ts-ignore
  const formatter = new Intl.ListFormat('en-GB')

  const availableCommands = formatter.format(Object.keys(commands))

  console.error(
    `Unkown command '${command}'. Available ones are ${availableCommands}.`
  )
  process.exit(1)
}

const defaultEnv = command === 'watch' ? 'development' : 'production'

process.env.NODE_ENV = process.env.NODE_ENV || defaultEnv

// Make sure commands gracefully respect termination signals (e.g. from Docker)
process.on('SIGTERM', () => {
  process.exit(0)
})
process.on('SIGINT', () => {
  process.exit(0)
})

commands[command]()
