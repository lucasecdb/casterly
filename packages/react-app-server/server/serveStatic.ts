import fs from 'fs'

import etag from 'etag'
import fresh from 'fresh'
import mime from 'mime'

import { MAX_AGE_LONG } from '../utils/maxAge'
import {
  isPreconditionFailure,
  requestContainsPrecondition,
  requestHeadersToNodeHeaders,
} from './utils'

export const serveStatic = (
  request: Request,
  path: string,
  enableCaching: boolean
) => {
  return new Promise<Response>((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        return reject(err)
      }

      if (stats.isDirectory()) {
        const error = new Error('Directory not allowed')
        ;(error as any).code = 'ENOENT'

        return reject(error)
      }

      const readStream = fs.createReadStream(path)

      const fileTag = etag(stats)
      const fileType = mime.getType(path)

      const headers = new Headers({
        etag: enableCaching ? fileTag : '',
        'cache-control': enableCaching ? `public, max-age=${MAX_AGE_LONG}` : '',
        'content-type': fileType ?? '',
      })

      if (requestContainsPrecondition(request)) {
        if (
          isPreconditionFailure(request, new Headers({ etag: fileTag || '' }))
        ) {
          return resolve(
            new Response(null, {
              status: 412,
              headers,
            })
          )
        }

        if (
          fresh(requestHeadersToNodeHeaders(request.headers), { etag: fileTag })
        ) {
          return resolve(
            new Response(null, {
              status: 304,
              headers,
            })
          )
        }
      }

      resolve(
        new Response(request.method === 'HEAD' ? null : (readStream as any), {
          status: 200,
          headers,
        })
      )
    })
  })
}
