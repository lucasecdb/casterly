import { Context } from 'koa'
import * as path from 'path'
import React, { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import Document from '../../components/Document'
import { Helmet } from '../../lib/helmet'
import { appDistServer } from '../../config/paths'
import {
  STATIC_COMPONENTS_PATH,
  STATIC_RUNTIME_HOT,
  STATIC_RUNTIME_MAIN,
  STATIC_RUNTIME_WEBPACK,
} from '../../config/constants'

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
  return { markup: renderToString(container) }
}

const handleRender = async (ctx: Context) => {
  const renderClient =
    ctx.query.nossr !== undefined && process.env.NODE_ENV !== 'production'

  const { assetManifest, pagesManifest } = ctx.state

  const clientAssetScripts = [
    assetManifest['commons.js'],
    assetManifest[`${STATIC_COMPONENTS_PATH}/index.js`],
    assetManifest[`${STATIC_RUNTIME_WEBPACK}.js`],
    assetManifest[`${STATIC_RUNTIME_MAIN}.js`],
    assetManifest[`${STATIC_RUNTIME_HOT}.js`],
    assetManifest['styles.js'],
  ].filter(Boolean)

  const [serverAssetScript] = [
    pagesManifest[`${STATIC_COMPONENTS_PATH}/index.js`],
  ].map(relativePath => path.join(appDistServer, relativePath))

  const styles = Object.keys(assetManifest)
    .filter(path => path.endsWith('.css'))
    .map(path => assetManifest[path])

  // const language = req.language

  ctx.set('Content-Type', 'text/html')

  if (renderClient) {
    ctx.body =
      '<!doctype html>' +
      renderToString(<Document scripts={clientAssetScripts} styles={styles} />)
  } else {
    const createRootComponent = (await import(serverAssetScript).then(
      interopDefault
    )) as (opts: Options) => Promise<any>

    const routerContext: { url?: string } = {}

    const {
      component: Component,
      renderFn = defaultRenderFn,
    } = await createRootComponent({
      requestUrl: ctx.url,
      requestHost: `${ctx.protocol}://${ctx.get('host')}`,
      cookie: ctx.headers.cookie,
      userAgent: ctx.headers['user-agent'],
      requestLanguage: '',
      routerContext,
      server: true,
    })

    const appRoot = (
      <StrictMode>
        <Component />
      </StrictMode>
    )

    const renderResult = await renderFn({ container: appRoot })

    const head = Helmet.rewind()

    if (routerContext.url) {
      ctx.redirect(routerContext.url)
    } else {
      ctx.status = 200
      ctx.body =
        '<!doctype html>' +
        renderToString(
          <Document
            markup={renderResult.markup}
            state={renderResult.state}
            head={head}
            scripts={clientAssetScripts}
            styles={styles}
          />
        )
    }
  }
}

export default handleRender
