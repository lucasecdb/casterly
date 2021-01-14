import config from '../userConfig'

export interface Options {
  isServer?: boolean
  dev?: boolean
  profile?: boolean
  configFn?: ReturnType<typeof config.loadWebpackConfig>
  babelConfigFn?: ReturnType<typeof config.loadBabelConfig>
}
