import { Routes, Scripts, Styles } from '@casterly/components'
import { RootServer } from '@casterly/components/server'
import { renderToPipeableStream } from 'react-dom/server'

export default async function handleRequest(
  request,
  statusCode,
  headers,
  context
) {
  let status = statusCode
  let didError = false

  const responseStream = await new Promise((resolve) => {
    const stream = renderToPipeableStream(
      <RootServer context={context} url={request.url}>
        <html>
          <head>
            <Styles />
          </head>
          <body>
            <div id="app">
              <Routes />
            </div>
            <Scripts />
          </body>
        </html>
      </RootServer>,
      {
        onCompleteShell() {
          if (didError) {
            status = 500
          }

          resolve(stream)
        },
        onError(error) {
          console.error(error)
          didError = true
        },
      }
    )
  })

  return {
    status,
    headers: {
      ...Object.fromEntries(headers),
      'content-type': 'text/html',
    },
    body: responseStream,
  }
}
