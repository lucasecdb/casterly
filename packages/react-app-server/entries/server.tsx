import React from 'react'
import { renderToString } from 'react-dom/server'

import Root from '../components/Root'
import Routes from '../components/Routes'
import Scripts from '../components/Scripts'
import Styles from '../components/Styles'

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
    <Root context={context} url={request.url}>
      <App />
    </Root>
  )

  return new Response('<!doctype html>' + content, {
    status: statusCode,
    headers,
  })
}
