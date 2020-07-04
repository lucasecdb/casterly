/* eslint-disable no-console */
import inspector from 'inspector'

import chalk from 'chalk'
import Koa from 'koa'

import { logStore } from '../output/logger'
import middlewares from './middlewares/index'
// import proxyMiddleware from './middlewares/proxy'
import webpackMiddleware from './middlewares/webpack'

const PORT = 3000

const start = async () => {
  try {
    inspector.open()
    console.log(
      chalk`
{dim
  {green Debugger started on ${inspector.url()}}
}`.trim()
    )
  } catch (err) {
    const errorStr = chalk`
{dim
  {red Could not establish a connection with the inspector}
  {gray ${err}}
}
    `.trim()

    console.error(errorStr)
  }

  const app = new Koa()

  // proxyMiddleware.set(app)

  await webpackMiddleware.set(app)

  app.use(middlewares)

  logStore.setState({ port: PORT })

  app.listen(PORT)
}

export default start
