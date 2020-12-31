import * as path from 'path'

import { constants, paths } from '@casterly/utils'
import * as config from '@casterly/utils/config'
// @ts-ignore
import fetch from 'make-fetch-happen'

import { _private_DefaultServer as DefaultServer } from './defaultServer'
import { readJSON } from './utils'

class DevServer extends DefaultServer {
  private buildServerReady = false

  constructor() {
    super({ dev: true })
  }

  protected getRoutesManifestFile = () => {
    return readJSON(
      path.join(paths.appBuildFolder, constants.ROUTES_MANIFEST_FILE)
    )
  }

  protected getBuildId() {
    return Promise.resolve(null)
  }

  protected getDevServerPort() {
    return process.env.BUILD_SERVER_PORT
      ? parseInt(process.env.BUILD_SERVER_PORT, 10)
      : undefined ??
          config.userConfig.buildServer?.port ??
          config.defaultConfig.buildServer.port
  }

  private async waitForBuildServer() {
    let attempts = 3

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await fetch(`http://localhost:${this.getDevServerPort()}/server-ready`)
        this.buildServerReady = true
        return
      } catch {
        attempts--

        if (attempts === 0) {
          return new Response("The build server isn't running.", {
            status: 500,
          })
        }
      }
    }
  }

  protected async handleRequest(req: Request, responseHeaders?: Headers) {
    if (!this.buildServerReady) {
      const maybeResponse = await this.waitForBuildServer()

      if (maybeResponse) {
        return maybeResponse
      }
    }

    for (const key in require.cache) {
      if (key.startsWith(paths.appServerBuildFolder)) {
        delete require.cache[key]
      }
    }

    return super.handleRequest(req, responseHeaders)
  }
}

export const createRequestHandler = () => {
  const serverInstance = new DevServer()

  return serverInstance.getRequestHandler()
}
