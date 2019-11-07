import { Middleware } from 'koa'
import { promises as fsp } from 'fs'
import * as path from 'path'

import { appDist, appDistServer } from '../../config/paths'
import {
  ASSET_MANIFEST_FILE,
  PAGES_MANIFEST_FILE,
} from '../../config/constants'

const readJSON = (filePath: string) =>
  fsp
    .readFile(filePath)
    .then(file => file.toString())
    .then(JSON.parse)

const manifest = (): Middleware => async (ctx, next) => {
  const assetManifest = await readJSON(path.join(appDist, ASSET_MANIFEST_FILE))

  const pagesManifest = await readJSON(
    path.join(appDistServer, PAGES_MANIFEST_FILE)
  )

  ctx.state.assetManifest = assetManifest
  ctx.state.pagesManifest = pagesManifest

  return next()
}

export default manifest