#!/usr/bin/env node

import chalk from 'chalk'

const commands: { [command: string]: () => Promise<void> } = {
  build: async () =>
    await import('../src/commands/build').then((i) => i.default()),
  watch: async () =>
    await import('../src/commands/watch').then((i) => i.default()),
}

const command = process.argv[2]

const hasCommand = Boolean(commands[command])

if (!hasCommand) {
  if (command === 'dev' || command === 'start') {
    console.error(
      chalk`Command {bold dev} and {bold start} have been deprecated.`
    )
    process.exit(1)
  }

  // @ts-ignore
  const formatter = new Intl.ListFormat('en-GB')

  const availableCommands = formatter.format(Object.keys(commands))

  console.error(
    `Unkown command '${command}'. Available ones are ${availableCommands}.`
  )
  process.exit(1)
}

const defaultEnv = command === 'dev' ? 'development' : 'production'
process.env.NODE_ENV = process.env.NODE_ENV || defaultEnv

commands[command]()
