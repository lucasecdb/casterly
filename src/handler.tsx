import { Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { promisify } from 'util'

import * as Log from './output/log'
import { errorPage, ok } from './templates'
import { appDist, appDistServer } from '../config/paths'
import {
  ASSET_MANIFEST_FILE,
  STATIC_COMPONENTS_PATH,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_RUNTIME_WEBPACK,
} from '../config/constants'

interface Options {
  requestUrl: string
  requestHost: string
  cookie?: string
  userAgent: string
  requestLanguage: string
  routerContext: object
  server: boolean
}

interface RenderOptions {
  container: React.ReactElement
}

function interopDefault(mod: any) {
  return mod.default || mod
}

async function defaultRenderFn({ container }: RenderOptions) {
  return { markup: ReactDOM.renderToString(container) }
}

const readFile = promisify(fs.readFile)

const handleRender = async (req: Request, res: Response) => {
  const renderClient =
    req.query.nossr !== undefined && process.env.NODE_ENV !== 'production'

  const assetManifest = await readFile(path.join(appDist, ASSET_MANIFEST_FILE))
    .then(file => file.toString())
    .then(JSON.parse)

  const clientAssetScripts = [
    assetManifest['commons.js'],
    assetManifest[`${STATIC_COMPONENTS_PATH}/index.js`],
    assetManifest[`${STATIC_RUNTIME_WEBPACK}.js`],
    assetManifest[`${STATIC_RUNTIME_MAIN}.js`],
    assetManifest[`${STATIC_RUNTIME_HOT}.js`],
    assetManifest['styles.js'],
  ].filter(Boolean)

  const serverAssetManifest = await readFile(
    path.join(appDistServer, ASSET_MANIFEST_FILE)
  )
    .then(file => file.toString())
    .then(JSON.parse)

  const [serverAssetScript] = [
    serverAssetManifest[`${STATIC_COMPONENTS_PATH}/index.js`],
  ].map(relativePath => path.join(appDistServer, relativePath))

  const styles = Object.keys(assetManifest)
    .filter(path => path.endsWith('.css'))
    .map(path => assetManifest[path])

  const language = req.language

  res.set('Content-Type', 'text/html')

  try {
    if (renderClient) {
      res.write(
        ok({
          scripts: clientAssetScripts,
          styles,
        })
      )
    } else {
      const createRootComponent = (await import(serverAssetScript).then(
        interopDefault
      )) as (opts: Options) => Promise<any>

      const routerContext: { url?: string } = {}

      const {
        component: Component,
        renderFn = defaultRenderFn,
      } = await createRootComponent({
        requestUrl: req.url,
        requestHost: `${req.protocol}://${req.get('host')}`,
        cookie: req.headers.cookie,
        userAgent: req.headers['user-agent'],
        requestLanguage: language,
        routerContext,
        server: true,
      })

      const root = (
        <StrictMode>
          <Component />
        </StrictMode>
      )

      const renderResult = await renderFn({ container: root })

      const head = Helmet.rewind()

      if (routerContext.url) {
        res.writeHead(302, {
          Location: routerContext.url,
        })
      } else {
        res.write(
          ok({
            markup: renderResult.markup,
            head,
            scripts: clientAssetScripts,
            state: renderResult.state,
            styles,
          })
        )
      }
    }
  } catch (err) {
    Log.error('An error ocurred while trying to server-side render')
    console.error(err)

    res.write(errorPage(err))
  } finally {
    res.end()
  }
}

export default handleRender
