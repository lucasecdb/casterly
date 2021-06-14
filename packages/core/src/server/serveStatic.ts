import fs from 'fs'

import etag from 'etag'
import fresh from 'fresh'
import mime from 'mime'

import type { Request } from '../fetch'
import { Headers } from '../fetch'
import { MAX_AGE_LONG } from '../utils/maxAge'
import type { ResponseObject } from './response'
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
  return new Promise<ResponseObject>((resolve, reject) => {
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

      const headers: Record<string, string> = {
        etag: enableCaching ? fileTag : '',
        'cache-control': enableCaching ? `public, max-age=${MAX_AGE_LONG}` : '',
        'content-type': fileType ?? '',
      }

      if (!enableCaching) {
        delete headers.etag
        delete headers['cache-control']
      }

      if (requestContainsPrecondition(request)) {
        if (
          isPreconditionFailure(request, new Headers({ etag: fileTag || '' }))
        ) {
          return resolve({ status: 412, outgoingHeaders: headers })
        }

        if (
          fresh(requestHeadersToNodeHeaders(request.headers), { etag: fileTag })
        ) {
          return resolve({ status: 304, outgoingHeaders: headers })
        }
      }

      resolve({
        status: 200,
        outgoingHeaders: headers,
        body: request.method === 'HEAD' ? null : readStream,
      })
    })
  })
}
