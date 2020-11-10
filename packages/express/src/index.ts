import { RequestHandler } from 'express'
// @ts-ignore
import { Response } from 'minipass-fetch'
import { createRequestHandler as defaultCreateRequestHandler } from 'react-app-server'

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

    // @ts-ignore
    handleRequest(request, req, res)
      .then((response) => {
        res.statusCode = response.status

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
