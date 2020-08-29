import { Middleware } from 'koa'

const status: Middleware = (ctx, next) => {
  ctx.status = 200

  return next()
}

export default status
