import { UrlWithParsedQuery, parse as parseUrl } from 'url'

import { Key, pathToRegexp, regexpToFunction } from 'path-to-regexp'

interface MatchRouteOptions<T> {
  route: string
  fn: (
    req: Request,
    params: T,
    url: UrlWithParsedQuery
  ) => Promise<Response | void>
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

  const routeHandler = async (req: Request) => {
    const url = parseUrl(req.url!, true)

    const result = match(url.pathname!)

    if (!result) {
      return
    }

    return await fn(req, result.params, url)
  }

  return routeHandler
}
