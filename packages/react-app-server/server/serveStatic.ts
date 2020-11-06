import { IncomingMessage, ServerResponse } from 'http'

import send from 'send'

import { MAX_AGE_LONG } from '../utils/maxAge'

export const serveStatic = (
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  enableCaching: boolean
) => {
  return new Promise((resolve, reject) => {
    send(req, path, {
      etag: enableCaching,
      cacheControl: enableCaching,
      lastModified: false,
      // MAX_AGE_LONG is in seconds, so we
      // need to convert it to milliseconds
      // first
      maxAge: MAX_AGE_LONG * 1000,
    })
      .on('directory', () => {
        // We don't allow directories to be read.
        const err: any = new Error('No directory access')
        err.code = 'ENOENT'
        reject(err)
      })
      .on('error', reject)
      .pipe(res)
      .on('finish', resolve)
  })
}
