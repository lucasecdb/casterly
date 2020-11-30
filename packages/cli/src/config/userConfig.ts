import fs from 'fs'
import { basename, extname, join } from 'path'

import { Configuration } from 'webpack'

import * as Log from '../output/log'
import { fileExistsSync } from '../utils/fileExists'
import { CONFIG_FILE } from './constants'

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

export interface CasterlyConfig {
  webpack?: (
    config: Configuration,
    options: { isServer: boolean; dev: boolean }
  ) => Configuration
  buildServer?: BuildServerConfig
  buildFolder?: string
}

export const defaultConfig: RecursiveRequired<CasterlyConfig> = {
  webpack: (config) => config,
  buildServer: {
    port: 8081,
  },
  buildFolder: '.dist',
}

export const loadUserConfig = (dir: string): CasterlyConfig => {
  const filePath = join(dir, CONFIG_FILE)

  if (fileExistsSync(filePath)) {
    let userConfig = require(filePath) as CasterlyConfig

    if (typeof userConfig === 'undefined') {
      Log.warn('Nothing was exported from configuration file.')
      userConfig = defaultConfig
    }

    return userConfig
  }

  const configFileBasename = basename(CONFIG_FILE, extname(CONFIG_FILE))

  const configWithDifferentExtension = ['.tsx', '.ts', '.jsx', '.json']
    .map((ext) => join(dir, configFileBasename + ext))
    .map(fileExistsSync)
    .every(Boolean)

  if (configWithDifferentExtension) {
    Log.warn(
      `Config file with unsupported extension found. Please rename the configuration file to ${JSON.stringify(
        CONFIG_FILE
      )}`
    )
  }

  return defaultConfig
}

export const userConfig = loadUserConfig(fs.realpathSync(process.cwd()))
