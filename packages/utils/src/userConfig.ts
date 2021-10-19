import fs from 'fs'
import { basename, extname, join } from 'path'

import { CONFIG_FILE } from './constants'
import { fileExistsSync } from './fileExists'

type RecursiveRequired<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? {
      [K in keyof T]-?: RecursiveRequired<T[K]>
    }
  : T

interface BuildServerConfig {
  port?: number
}

interface ExperimentsConfig {
  esbuildDependencies?: boolean
  esmExternals?: boolean | 'loose'
}

export interface CasterlyConfig {
  buildServer?: BuildServerConfig
  buildFolder?: string
  loaderRuntime?: string
  experiments?: ExperimentsConfig
}

export const defaultConfig: RecursiveRequired<CasterlyConfig> = {
  buildServer: {
    port: 8081,
  },
  loaderRuntime: '',
  buildFolder: '.dist',
  experiments: {
    esbuildDependencies: false,
    esmExternals: false,
  },
}

export const loadUserConfig = (dir: string): CasterlyConfig => {
  const filePath = join(dir, CONFIG_FILE)

  if (fileExistsSync(filePath)) {
    let userConfig = require(filePath) as CasterlyConfig

    if (typeof userConfig === 'undefined') {
      console.warn('Nothing was exported from configuration file.')
      userConfig = defaultConfig
    }

    return userConfig
  }

  const configFileBasename = basename(CONFIG_FILE, extname(CONFIG_FILE))

  const configWithDifferentExtension = ['.tsx', '.ts', '.jsx', '.json']
    .map((ext) => join(dir, configFileBasename + ext))
    .map(fileExistsSync)
    .some(Boolean)

  if (configWithDifferentExtension) {
    console.warn(
      `Config file with unsupported extension found. Please rename the configuration file to ${JSON.stringify(
        CONFIG_FILE
      )}`
    )
  }

  return defaultConfig
}

export const userConfig = loadUserConfig(fs.realpathSync(process.cwd()))
