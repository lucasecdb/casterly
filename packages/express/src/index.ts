import './globals'

import { Writable } from 'stream'

import { createRequestHandler as defaultCreateRequestHandler } from '@casterly/core'
import type { RequestHandler } from 'express'

export const createRequestHandler = (): RequestHandler => {
  const handleRequest = defaultCreateRequestHandler()

  return async (req, res, next) => {
    const request = new global.Request(req.url ?? '/', {
      method: req.method,
      headers: Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    const responseHeaders = new global.Headers(
      Object.entries(res.getHeaders()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>
    )

    const writable = new Writable()

    writable.write = res.write.bind(res)
    writable.destroy = res.destroy.bind(res)
    writable.end = res.end.bind(res)
    writable.cork = res.cork.bind(res)
    writable.uncork = res.uncork.bind(res)

    try {
      const response = await handleRequest(request, responseHeaders, {
        responseStream: writable,
      })

      res.status(response.status)

      for (const key of res.getHeaderNames()) {
        res.removeHeader(key)
      }

      Object.entries(response.outgoingHeaders ?? {}).forEach(([key, value]) => {
        res.set(key, value)
      })

      if (response.body == null) {
        res.end()
      } else if (typeof response.body === 'object' && 'pipe' in response.body) {
        if (response.body !== writable) {
          response.body.pipe(res)
        }

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
