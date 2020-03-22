import { Context, Middleware } from 'koa'
// import * as path from 'path'
import React from 'react'
import { renderToString } from 'react-dom/server'

// import { appDistServer } from '../../config/paths'
import Document from '../../components/Document'
import { renderToHTML } from '../utils'

const render = (): Middleware => async (ctx: Context) => {
  const renderClient =
    ctx.query.nossr !== undefined && process.env.NODE_ENV !== 'production'

  const { assetManifest, componentsManifest } = ctx.state

  const assets: string[] = assetManifest.components['index']

  const indexComponentEntrypoint = componentsManifest['index']

  // const routesEntrypoint = componentsManifest['routes']

  // const routesPath = path.join(appDistServer, routesEntrypoint)

  const scriptAssets = assets.filter((path) => path.endsWith('.js'))
  const styleAssets = assets.filter((path) => path.endsWith('.css'))

  // const language = req.language

  ctx.set('Content-Type', 'text/html')

  if (renderClient) {
    ctx.body =
      '<!doctype html>' +
      renderToString(
        <Document
          scripts={scriptAssets}
          styles={styleAssets}
          componentName="index"
        />
      )
  } else {
    const { head, routerContext, markup, state } = await renderToHTML(
      indexComponentEntrypoint
    )

    if (routerContext.url) {
      ctx.redirect(routerContext.url)
    } else {
      ctx.status = 200
      ctx.body =
        '<!doctype html>' +
        renderToString(
          <Document
            markup={markup}
            state={state}
            head={head}
            scripts={scriptAssets}
            styles={styleAssets}
            componentName="index"
          />
        )
    }
  }
}

export default render
