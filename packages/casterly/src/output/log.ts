import chalk from 'chalk'

const prefixes = {
  wait: chalk`{dim casterly} {magenta wait}: `,
  error: chalk`{dim casterly} {red error}:`,
  warn: chalk`{dim casterly} {yellow warn}: `,
  ready: chalk`{dim casterly} {green ready}:`,
  info: chalk`{dim casterly} {cyan info}: `,
}

export function wait(...message: any[]) {
  console.log(prefixes.wait, ...message)
}

export function error(...message: any[]) {
  console.error(prefixes.error, ...message)
}

export function warn(...message: any[]) {
  console.warn(prefixes.warn, ...message)
}

export function info(...message: any[]) {
  console.log(prefixes.info, ...message)
}

export function ready(...message: any[]) {
  console.log(prefixes.ready, ...message)
}
