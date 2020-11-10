import chalk from 'chalk'
import createStore from 'unistore'

import { WebpackError } from '../build/utils'
import * as Log from './log'

type WebpackState =
  | { loading: true }
  | {
      loading: false
      typeChecking: boolean
      errors: WebpackError[] | null
      warnings: WebpackError[] | null
    }

export type LoggerStoreStatus =
  | { bootstrap: true; port: number | null }
  | ({ bootstrap: false; port: number | null } & WebpackState)

export const logStore = createStore<LoggerStoreStatus>({
  bootstrap: true,
  port: null,
})

let lastStore: LoggerStoreStatus = {} as any
function hasStoreChanged(nextStore: LoggerStoreStatus) {
  if (
    [
      ...new Set([...Object.keys(lastStore), ...Object.keys(nextStore)]),
    ].every((key) =>
      Object.is((lastStore as any)[key], (nextStore as any)[key])
    )
  ) {
    return false
  }

  lastStore = nextStore
  return true
}

const transformWebpackError = (error: WebpackError) => {
  const { message, moduleName, loc } = error

  return `${moduleName ? chalk`{bold ${moduleName}}` : ''}${
    loc ? chalk`:{dim ${loc}}` : ''
  }\n\n  ${message}`
}

logStore.subscribe((state) => {
  if (!hasStoreChanged(state)) {
    return
  }

  if (state.bootstrap === true) {
    Log.wait('starting the development server')
    Log.info(`build server ready on http://localhost:${state.port}`)
    return
  }

  if (state.loading === true) {
    Log.wait('compiling...')
    return
  }

  if (state.errors && state.errors.length > 0) {
    Log.error(transformWebpackError(state.errors[0]))

    return
  }

  if (state.warnings && state.warnings.length > 0) {
    Log.warn(state.warnings.map(transformWebpackError).join('\n\n'))

    Log.ready('compiled with warnings')
    return
  }

  Log.ready('compiled successfully')
})
