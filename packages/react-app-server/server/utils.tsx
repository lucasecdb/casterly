import * as path from 'path'
import React, { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import { Head } from './lib/head'
import { appDistServer } from '../config/paths'

interface Options {
  requestUrl: string
  requestHost: string
  cookie?: string
  userAgent: string
  requestLanguage: string
  routerContext: object
  server: boolean
}

function interopDefault(mod: any) {
  return mod.default || mod
}

async function defaultRenderFn({
  container,
}: RenderOptions): Promise<RenderResult> {
  return { markup: renderToString(container) }
}

interface RenderOptions {
  container: React.ReactElement
}

interface RenderResult {
  markup: string
  state?: any
}

export const renderToHTML = async (componentEntrypoint: string, props = {}) => {
  const componentPath = path.join(appDistServer, componentEntrypoint)

  const Component = (await import(componentPath).then(
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
      <Component {...props} />
    </StrictMode>
  )

  const { markup, state } = await renderFn({ container: appRoot })

  const head = Head.rewind()

  return { head, routerContext, markup, state }
}
