import express, { Application } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

import * as paths from '../../config/paths'

export default {
  set: (app: Application) => {
    const appPackageJson = require(paths.appPackageJson)

    if (appPackageJson.proxy) {
      app.use(
        appPackageJson.proxy.path,
        createProxyMiddleware({
          ...appPackageJson.proxy.config,
          logLevel: 'silent',
        })
      )
    }

    app.use('/', express.static('public'))
  },
}
