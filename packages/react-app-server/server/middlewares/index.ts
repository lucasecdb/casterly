import compose from 'koa-compose'
import helmet from 'koa-helmet'
import serve from 'koa-static'

import error from './error'
import manifest from './manifest'
import handleRender from './handler'

const DIST_PUBLIC = '.dist/public'
const DIST_STATIC = '.dist/static'

export default compose([
  helmet(),
  serve(DIST_PUBLIC, { root: '/' }),
  serve(DIST_STATIC, { root: '/static' }),
  manifest(),
  error(),
  handleRender,
])
