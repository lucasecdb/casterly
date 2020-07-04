import { promises as fsp } from 'fs'
import * as path from 'path'

import { Middleware } from 'koa'

import {
  ASSET_MANIFEST_FILE,
  COMPONENTS_MANIFEST_FILE,
} from '../../config/constants'
import { appDist, appDistServer } from '../../config/paths'

const readJSON = (filePath: string) =>
  fsp
    .readFile(filePath)
    .then((file) => file.toString())
    .then(JSON.parse)

const manifest = (): Middleware => async (ctx, next) => {
  const assetManifest = await readJSON(path.join(appDist, ASSET_MANIFEST_FILE))

  const componentsManifest = await readJSON(
    path.join(appDistServer, COMPONENTS_MANIFEST_FILE)
  )

  ctx.state.assetManifest = assetManifest
  ctx.state.componentsManifest = componentsManifest

  return next()
}

export default manifest
