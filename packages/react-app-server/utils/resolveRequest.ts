import * as path from 'path'

import resolve from 'resolve'

const resolveRequest = (request: string, issuer: string) => {
  const basedir =
    issuer.endsWith(path.posix.sep) || issuer.endsWith(path.win32.sep)
      ? issuer
      : path.dirname(issuer)

  return resolve.sync(request, { basedir })
}

export default resolveRequest
