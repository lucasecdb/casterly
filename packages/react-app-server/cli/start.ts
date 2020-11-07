import { createServer } from 'http'

import * as Log from '../output/log'
import { DefaultServer } from '../server/defaultServer'

const start = () => {
  const app = new DefaultServer()

  const server = createServer(app.getRequestHandler())

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.on('listening', resolve)

    server.listen(3000)
  }).then(() => {
    Log.info('Server listening on port 3000')
  })
}

export default start
