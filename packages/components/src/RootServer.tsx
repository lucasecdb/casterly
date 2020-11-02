import React from 'react'
import { StaticRouter } from 'react-router-dom/server'

import { RootContext, RootContextProvider } from './RootContext'

export const RootServer: React.FC<{ context: unknown; url: string }> = ({
  context,
  url,
  children,
}) => {
  return (
    <RootContextProvider value={context as RootContext}>
      <StaticRouter location={url}>{children}</StaticRouter>
    </RootContextProvider>
  )
}
