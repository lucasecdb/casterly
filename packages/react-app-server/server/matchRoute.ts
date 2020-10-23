import { IncomingMessage, ServerResponse } from 'http'
import { UrlWithStringQuery, parse as parseUrl } from 'url'

import { Key, pathToRegexp, regexpToFunction } from 'path-to-regexp'

interface MatchRouteOptions<T> {
  route: string
  fn: (
    req: IncomingMessage,
    res: ServerResponse,
    params: T,
    url: UrlWithStringQuery
  ) => Promise<any>
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

  const routeHandler = async (req: IncomingMessage, res: ServerResponse) => {
    const result = match(req.url ?? '')

    if (!result) {
      return
    }

    await fn(req, res, result.params, parseUrl(req.url!))
  }

  return routeHandler
}
