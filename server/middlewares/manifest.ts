import { NextFunction, Request, Response } from 'express'
import { promises as fsp } from 'fs'
import * as path from 'path'

import { appDist, appDistServer } from '../../config/paths'
import {
  ASSET_MANIFEST_FILE,
  PAGES_MANIFEST_FILE,
} from '../../config/constants'

const manifest = () => async (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  const assetManifest = await fsp
    .readFile(path.join(appDist, ASSET_MANIFEST_FILE))
    .then(file => file.toString())
    .then(JSON.parse)

  const pagesManifest = await fsp.readFile(
    path.join(appDistServer, PAGES_MANIFEST_FILE)
  )

  res.locals.assetManifest = assetManifest
  res.locals.pagesManifest = pagesManifest

  next()
}

export default manifest
