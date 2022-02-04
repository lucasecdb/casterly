import './globals'

import type { BuildMode, ServerBuild } from '@casterly/core'
import { createRequestHandler as defaultCreateRequestHandler } from '@casterly/core'
import { Request } from '@casterly/core/fetch'
import type { RequestHandler } from 'express'

export const createRequestHandler = ({
  server,
  mode,
}: {
  server: ServerBuild
  mode: BuildMode
}): RequestHandler => {
  const handleRequest = defaultCreateRequestHandler({ server, mode })

  return async (req, res, next) => {
    const origin = `${req.protocol}://${req.get('host')}`
    const url = new URL(req.url, origin)

    const request = new Request(url.href, {
      method: req.method,
      headers: Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    try {
      const response = await handleRequest(request)

      res.status(response.status)

      for (const key of res.getHeaderNames()) {
        res.removeHeader(key)
      }

      /*
      Object.entries(response.outgoingHeaders ?? {}).forEach(([key, value]) => {
        res.set(key, value)
      })
      */

      if (response.body == null) {
        res.end()
      } else if (
        typeof response.body === 'object' &&
        'pipe' in response.body &&
        typeof response.body.pipe === 'function'
      ) {
        response.body.pipe(res)
      } else {
        res.end(response.body)
      }
    } catch (err) {
      next(err)
    }
  }
}
