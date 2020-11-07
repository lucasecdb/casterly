import { Scripts, Styles } from '@app-server/components'
import { RootServer } from '@app-server/components/server'
import React from 'react'
import { renderToNodeStream } from 'react-dom/server'

import App from './src/App'

const Document = () => {
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
          <App />
        </div>
        <Scripts />
      </body>
    </html>
  )
}

export default function (request, statusCode, headers, context) {
  const content = renderToNodeStream(
    <RootServer context={context} url={request.url}>
      <Document />
    </RootServer>
  )

  content.unshift('<!doctype html>')

  return new Response(content, {
    status: statusCode,
    headers,
  })
}
