import React, { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'

export function interopDefault(mod: any) {
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

export const renderToHTML = async (element: JSX.Element, path?: string) => {
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
      <StaticRouter location={path}>{element}</StaticRouter>
    </StrictMode>
  )

  const { markup, state } = await renderFn({ container: appRoot })

  return { routerContext, markup, state }
}
