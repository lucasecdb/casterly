import chalk from 'chalk'

const prefixes = {
  wait: chalk`{dim react-app-server} {magenta wait}:`,
  error: chalk`{dim react-app-server} {red error}:`,
  warn: chalk`{dim react-app-server} {yellow warn}:`,
  ready: chalk`{dim react-app-server} {green ready}:`,
  info: chalk`{dim react-app-server} {cyan info}:`,
}

export function wait(...message: any[]) {
  console.log(prefixes.wait, ...message)
}

export function error(...message: any[]) {
  console.log(prefixes.error, ...message)
}

export function warn(...message: any[]) {
  console.log(prefixes.warn, ...message)
}

export function info(...message: any[]) {
  console.log(prefixes.info, ...message)
}

export function ready(...message: any[]) {
  console.log(prefixes.ready, ...message)
}
