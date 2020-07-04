import Koa from 'koa'

import * as Log from '../output/log'
import middlewares from './middlewares/index'

const start = () => {
  const app = new Koa()

  app.use(middlewares)

  app.listen(3000, () => {
    Log.info('Server listening on port 3000')
  })
}

export default start
