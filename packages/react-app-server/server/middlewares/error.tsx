import React from 'react'
import { renderToString } from 'react-dom/server'
import { Middleware } from 'koa'

import Document from '../../components/Document'
import * as Log from '../../output/log'
import { renderToHTML } from '../utils'

const ERROR_COMPONENT_NAME = 'error'

const error = (): Middleware => async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    Log.error('An error ocurred while trying to server-side render')
    console.error(err)

    const errorComponentEntrypoint =
      ctx.state.componentsManifest[ERROR_COMPONENT_NAME]

    const assets: string[] =
      ctx.state.assetManifest.components[ERROR_COMPONENT_NAME]

    const scriptAssets = assets.filter(path => path.endsWith('.js'))
    const styleAssets = assets.filter(path => path.endsWith('.css'))

    const props = {
      error: { name: err.name, message: err.message, stack: err.stack },
    }

    const { head, markup } = await renderToHTML(errorComponentEntrypoint, props)

    ctx.status = 500
    ctx.body =
      '<!doctype html>' +
      renderToString(
        <Document
          markup={markup}
          head={head}
          scripts={scriptAssets}
          styles={styleAssets}
          componentName={ERROR_COMPONENT_NAME}
          componentProps={props}
        />
      )
  }
}

export default error
