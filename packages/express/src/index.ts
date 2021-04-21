import { createRequestHandler as defaultCreateRequestHandler } from '@casterly/core'
import type { RequestHandler } from 'express'
// @ts-ignore
import { Response } from 'minipass-fetch'

export const createRequestHandler = (): RequestHandler => {
  const handleRequest = defaultCreateRequestHandler()

  return (req, res, next) => {
    const request = new Request(req.url ?? '/', {
      method: req.method,
      headers: Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>,
    })

    const responseHeaders = new Headers(
      Object.entries(res.getHeaders()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : value?.toString(),
      ]) as Array<[string, string]>
    )

    handleRequest(request, responseHeaders)
      .then((response) => {
        res.statusCode = response.status

        for (const header of Object.keys(res.getHeaders())) {
          res.removeHeader(header)
        }

        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })

        Response.writeToStream(res, response)
      })
      .catch((err) => {
        next(err)
      })
  }
}
