import React from 'react'
import { StaticRouter } from 'react-router-dom/server'

import { RootContext, RootContextProvider } from './RootContext'

const Root: React.FC<{ context: unknown; url: string }> = ({
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

export default Root
