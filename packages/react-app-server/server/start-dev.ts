/* eslint-disable no-console */
import express from 'express'
import inspector from 'inspector'
import chalk from 'chalk'

import server from './index'
import proxyMiddleware from './middlewares/proxy'
import webpackMiddleware from './middlewares/webpack'
import { logStore } from '../output/logger'

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

  const app = express()

  proxyMiddleware.set(app)

  await webpackMiddleware.set(app)

  app.use(server)

  logStore.setState({ port: PORT })

  app.listen(PORT)
}

export default start
