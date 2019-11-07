import * as path from 'path'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Middleware } from 'koa'

import { Head } from '../lib/head'
import Document from '../../components/Document'
import * as paths from '../../config/paths'
import * as Log from '../../output/log'

const error = (): Middleware => async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    Log.error('An error ocurred while trying to server-side render')
    console.error(err)

    const errorComponentPath = path.join(
      paths.appDistServer,
      ctx.state.pagesManifest['error']
    )

    const assets: string[] = ctx.state.assetManifest.components['error']

    const scriptAssets = assets.filter(path => path.endsWith('.js'))
    const styleAssets = assets.filter(path => path.endsWith('.css'))

    const { default: ErrorComponent } = await import(errorComponentPath)

    const markup = renderToString(<ErrorComponent error={err} />)

    const head = Head.rewind()

    ctx.status = 500
    ctx.body =
      '<!doctype html>' +
      renderToString(
        <Document
          markup={markup}
          head={head}
          scripts={scriptAssets}
          styles={styleAssets}
        />
      )
  }
}

export default error