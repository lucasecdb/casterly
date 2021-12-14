import * as config from '@casterly/utils/lib/userConfig'
import cors from 'cors'
import express from 'express'
import { createServer } from 'vite'

import { viteConfig } from '../config/viteConfig'
import { logStore } from '../output/logger'

export default async function startWatch() {
  process.env.NODE_ENV = 'development'

  const app = express()

  app.use(cors())

  let setServerReady: () => void

  const serverReadyPromise = new Promise<void>((resolve) => {
    setServerReady = resolve
  })

  async function startWatch() {
    setServerReady()
  }

  startWatch()

  app.get('/server-ready', (_, res) => {
    serverReadyPromise.then(() => {
      res.send('ok')
    })
  })

  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : undefined ??
      config.userConfig.buildServer?.port ??
      config.defaultConfig.buildServer.port

  const vite = await createServer(viteConfig)

  app.use(vite.middlewares)

  app.listen(port, () => {
    logStore.setState({ port })
  })
}
