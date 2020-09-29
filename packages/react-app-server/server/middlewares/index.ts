import * as path from 'path'

import compose from 'koa-compose'
import helmet from 'koa-helmet'

import { appDist, appDistPublic } from '../../config/paths'
import matchRoute from '../matchRoute'
import { serveStatic } from '../serveStatic'
import error from './error'
import manifest from './manifest'
import render from './render'
import status from './status'

export default compose([
  helmet(),
  status,
  /*
  matchRoute<{ path: string }>({
    route: '/:path*',
    fn: async (ctx, params, next) => {
      try {
        await serveStatic(
          ctx.req,
          ctx.res,
          path.join(appDistPublic, ...(params.path || []))
        )
      } catch (err) {
        if (err.code === 'ENOENT') {
          return next()
        }

        throw err
      }
    },
  }),
  matchRoute<{ path: string }>({
    route: '/static/:path*',
    fn: async (ctx, params) => {
      try {
        await serveStatic(
          ctx.req,
          ctx.res,
          path.join(appDist, 'static', ...(params.path || []))
        )
      } catch {
        ctx.status = 404
      }
    },
  }),
  */
  manifest(),
  error(),
  render(),
])
