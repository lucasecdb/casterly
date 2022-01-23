import './globals'

import { createRequestHandler as defaultCreateRequestHandler } from '@casterly/core'
import type { RequestHandler } from 'express'

export const createRequestHandler = (): RequestHandler => {
  const handleRequest = defaultCreateRequestHandler()

  return async (req, res, next) => {
    // @ts-ignore
    const request = new global.Request(req.url ?? '/', {
      method: req.method,
      headers: Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    // @ts-ignore
    const responseHeaders = new global.Headers(
      Object.entries(res.getHeaders()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>
    )

    try {
      const response = await handleRequest(request, responseHeaders)

      res.status(response.status)

      for (const key of res.getHeaderNames()) {
        res.removeHeader(key)
      }

      Object.entries(response.outgoingHeaders ?? {}).forEach(([key, value]) => {
        res.set(key, value)
      })

      if (response.body == null) {
        res.end()
      } else if (
        typeof response.body === 'object' &&
        'pipe' in response.body &&
        typeof response.body.pipe === 'function'
      ) {
        response.body.pipe(res)

        if (typeof response.onReadyToStream === 'function') {
          response.onReadyToStream()
        }
      } else {
        res.end(response.body)
      }
    } catch (err) {
      next(err)
    }
  }
}
