import path from 'path'

import { Middleware } from 'koa'
import React from 'react'
import { renderToString } from 'react-dom/server'

import Document from '../../components/Document'
import { appDistServer } from '../../config/paths'
import * as Log from '../../output/log'
import { interopDefault, renderToHTML } from '../utils'

const ERROR_COMPONENT_NAME = 'error'

const resolveErrorComponent = async (entrypoint: string, props = {}) => {
  const componentPath = path.join(appDistServer, entrypoint)

  const Component = (await import(componentPath).then(
    interopDefault
  )) as React.ComponentType

  return <Component {...props} />
}

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

    const scriptAssets = assets.filter((path) => path.endsWith('.js'))
    const styleAssets = assets.filter((path) => path.endsWith('.css'))

    const props = {
      error: { name: err.name, message: err.message, stack: err.stack },
    }

    const { head, markup } = await renderToHTML(
      await resolveErrorComponent(errorComponentEntrypoint, props)
    )

    ctx.set('x-robots-tag', 'noindex, nofollow')

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
