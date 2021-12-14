import createStore from 'unistore'

import * as Log from './log'

type State =
  | { loading: true; fileName?: string }
  | {
      loading: false
      errors: Error[] | null
      warnings: Error[] | null
      buildDuration: number
    }

export type LoggerStoreStatus =
  | { bootstrap: true; port: number | null }
  | ({ bootstrap: false; port: number | null } & State)

export const logStore = createStore<LoggerStoreStatus>({
  bootstrap: true,
  port: null,
})

let lastStore: LoggerStoreStatus = {} as any
function hasStoreChanged(nextStore: LoggerStoreStatus) {
  if (
    [...new Set([...Object.keys(lastStore), ...Object.keys(nextStore)])].every(
      (key) => Object.is((lastStore as any)[key], (nextStore as any)[key])
    )
  ) {
    return false
  }

  lastStore = nextStore
  return true
}

logStore.subscribe((state) => {
  if (!hasStoreChanged(state)) {
    return
  }

  if (state.bootstrap === true) {
    Log.wait('starting the build server')
    Log.info(`build server listening on http://localhost:${state.port}`)
    return
  }

  if (state.loading === true) {
    if (state.fileName) {
      Log.wait(`${state.fileName} changed, compiling...`)
    } else {
      Log.wait('compiling...')
    }
    return
  }

  if (state.errors && state.errors.length > 0) {
    Log.error(state.errors[0])

    return
  }

  if (state.warnings && state.warnings.length > 0) {
    Log.warn(state.warnings.map((e) => e.message).join('\n\n'))

    Log.ready('compiled with warnings')
    return
  }

  Log.ready(`compiled successfully in ${state.buildDuration} seconds`)
})
