// @ts-ignore
import { custom } from 'babel-loader'

import * as Log from '../../../output/log'
import casterlyBabel from '../../babelPreset'

export default custom((babel: any) => {
  const presetItem = babel.createConfigItem(casterlyBabel, {
    type: 'preset',
  })

  const configs = new Set()

  return {
    customOptions(opts: any) {
      const custom = {
        isServer: opts.isServer,
        dev: opts.dev,
        hasReactRefresh: opts.hasReactRefresh,
        hasJsxRuntime: opts.hasJsxRuntime,
      }
      const loader = Object.assign(
        {
          cacheDirectory: false,
        },
        opts
      )

      delete loader.isServer
      delete loader.dev
      delete loader.hasReactRefresh
      delete loader.hasJsxRuntime

      return { loader, custom }
    },
    config(
      this: any,
      cfg: any,
      {
        _,
        customOptions: { isServer, dev, hasReactRefresh, hasJsxRuntime },
      }: any
    ) {
      const options = Object.assign({}, cfg.options)

      if (cfg.hasFilesystemConfig()) {
        for (const file of [cfg.babelrc, cfg.config]) {
          // We only log for client compilation otherwise there will be double output
          if (file && !isServer && !configs.has(file)) {
            configs.add(file)
            Log.info(`Using external babel configuration from ${file}`)
          }
        }
      } else {
        // Add our default preset if no "babelrc" is found.
        options.presets = [...options.presets, presetItem]
      }

      options.caller.isServer = isServer
      options.caller.isDev = dev
      options.caller.hasJsxRuntime = hasJsxRuntime

      const emitWarning = this.emitWarning.bind(this)

      Object.defineProperty(options.caller, 'onWarning', {
        enumerable: false,
        writable: false,
        value: (options.caller.onWarning = function (reason: any) {
          if (!(reason instanceof Error)) {
            reason = new Error(reason)
          }
          emitWarning(reason)
        }),
      })

      options.plugins = options.plugins || []

      if (hasReactRefresh) {
        const reactRefreshPlugin = babel.createConfigItem(
          [require('react-refresh/babel'), { skipEnvCheck: true }],
          { type: 'plugin' }
        )
        options.plugins.unshift(reactRefreshPlugin)
      }

      return options
    },
  }
})
