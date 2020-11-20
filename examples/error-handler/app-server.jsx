import { Scripts, Styles } from '@casterly/components'
import { RootServer } from '@casterly/components/server'
import { renderToNodeStream, renderToString } from 'react-dom/server'

import App from './src/App'
import ErrorPage from './src/ErrorPage'

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
  try {
    const content = renderToString(
      <RootServer context={context} url={request.url}>
        <Document />
      </RootServer>
    )

    return new Response('<!doctype html>' + content, {
      status: statusCode,
      headers: {
        ...Object.fromEntries(headers),
        'content-type': 'text/html',
      },
    })
  } catch (err) {
    const content = renderToNodeStream(
      <RootServer context={context} url={request.url}>
        <ErrorPage error={err} />
      </RootServer>
    )

    content.unshift('<!doctype html>')

    return new Response(content, {
      status: 500,
      headers: {
        ...Object.fromEntries(headers),
        'content-type': 'text/html',
      },
    })
  }
}
