import Koa from 'koa'

import middlewares from './middlewares/index'
import * as Log from '../output/log'

const start = () => {
  const app = new Koa()

  app.use(middlewares)

  app.listen(3000, () => {
    Log.info('Server listening on port 3000')
  })
}

export default start
