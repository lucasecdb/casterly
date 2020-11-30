import { CasterlyConfig } from '../userConfig'

export interface Options {
  isServer?: boolean
  dev?: boolean
  profile?: boolean
  configFn?: CasterlyConfig['webpack']
}
