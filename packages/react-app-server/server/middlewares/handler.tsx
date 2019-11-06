import { Context } from 'koa'
import * as path from 'path'
import React, { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import Document from '../../components/Document'
import { Helmet } from '../../lib/helmet'
import { appDistServer } from '../../config/paths'
import {
  STATIC_COMPONENTS_PATH,
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

interface RenderResult {
  markup: string
  state?: any
}

function interopDefault(mod: any) {
  return mod.default || mod
}

async function defaultRenderFn({
  container,
}: RenderOptions): Promise<RenderResult> {
  return { markup: renderToString(container) }
}

const handleRender = async (ctx: Context) => {
  const renderClient =
    ctx.query.nossr !== undefined && process.env.NODE_ENV !== 'production'

  const { assetManifest, pagesManifest } = ctx.state

  /*const clientAssetScripts = [
    assetManifest['commons.js'],
    assetManifest[`${STATIC_COMPONENTS_PATH}/index.js`],
    assetManifest[`${STATIC_RUNTIME_WEBPACK}.js`],
    assetManifest[`${STATIC_RUNTIME_MAIN}.js`],
    assetManifest['styles.js'],
  ].filter(Boolean)*/

  const clientAssetScripts = assetManifest.components['index']

  const appIndexPath = path.join(appDistServer, pagesManifest['index'])

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
    const Component = (await import(appIndexPath).then(
      interopDefault
    )) as React.ComponentType

    const routerContext: { url?: string } = {}

    /*const {
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
    })*/

    const renderFn = defaultRenderFn

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
