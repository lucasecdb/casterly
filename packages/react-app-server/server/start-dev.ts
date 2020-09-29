import { createServer } from 'http'
import inspector from 'inspector'

import chalk from 'chalk'

import { logStore } from '../output/logger'
import { DevServer } from './devServer'

const PORT = 3000

const start = async () => {
  try {
    inspector.open()
  } catch (err) {
    const errorStr = chalk`
{dim
  {red Could not establish a connection with the inspector}
  {gray ${err}}
}
    `.trim()

    console.error(errorStr)
  }

  const app = new DevServer()
  const server = createServer(app.getRequestHandler())

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.on('listening', resolve)

    server.listen(3000)
  }).then(() => {
    logStore.setState({ port: PORT })
  })
}

export default start
