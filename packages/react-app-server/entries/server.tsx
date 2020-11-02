import { Scripts, Styles } from '@app-server/components'
import { RootServer, Routes } from '@app-server/components/server'
import React from 'react'
import { renderToString } from 'react-dom/server'

const App: React.FC = () => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <Styles />
      </head>
      <body>
        <div id="root">
          <Routes />
        </div>
        <Scripts />
      </body>
    </html>
  )
}

export default function (
  request: Request,
  statusCode: number,
  headers: Headers,
  context: unknown
) {
  const content = renderToString(
    <RootServer context={context} url={request.url}>
      <App />
    </RootServer>
  )

  return new Response('<!doctype html>' + content, {
    status: statusCode,
    headers,
  })
}
