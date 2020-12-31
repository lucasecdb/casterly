import path from 'path'

import { paths } from '@casterly/utils'

const serverDirectory = path.resolve(__dirname, '..')
const resolveServer = (relativePath: string) =>
  path.resolve(serverDirectory, relativePath)

const serverPath = resolveServer('.')
const serverClientHot = resolveServer('client/hot.js')
const serverDefaultAppServer = resolveServer('client/default-app-server.jsx')
const serverDefaultAppBrowser = resolveServer('client/default-app-browser.jsx')

export = {
  serverPath,
  serverClientHot,
  serverDefaultAppServer,
  serverDefaultAppBrowser,
  ...paths,
}
