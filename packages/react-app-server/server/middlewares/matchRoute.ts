import { Middleware, Next, ParameterizedContext } from 'koa'
import { Key, pathToRegexp, regexpToFunction } from 'path-to-regexp'

interface MatchRouteOptions<T> {
  route: string
  fn: (ctx: ParameterizedContext, params: T, next: Next) => Promise<any>
}

export default function matchRoute<
  // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
>({ route, fn }: MatchRouteOptions<T>) {
  const keys: Key[] = []
  const matcherRegex = pathToRegexp(route, keys, {
    delimiter: '/',
    sensitive: false,
  })
  const match = regexpToFunction<T>(matcherRegex, keys)

  const middleware: Middleware = (ctx, next) => {
    const result = match(ctx.path)

    if (!result) {
      return next()
    }

    return fn(ctx, result.params, next)
  }

  return middleware
}
