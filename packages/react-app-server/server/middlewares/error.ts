import { Middleware } from 'koa'

import * as Log from '../../output/log'

const error = (): Middleware => async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    Log.error('An error ocurred while trying to server-side render')
    console.error(err)

    ctx.status = 500
    ctx.body = 'Internal Server Error'
  }
}

export default error
