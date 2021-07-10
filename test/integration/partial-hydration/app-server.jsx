import { Routes, Scripts, Styles } from '@casterly/components'
import { RootServer } from '@casterly/components/server'
import { pipeToNodeWritable } from 'react-dom/server'

export default async function handleRequest(
  request,
  statusCode,
  headers,
  context,
  { responseStream }
) {
  let status = statusCode
  let didError = false

  const startWriting = await new Promise((resolve) => {
    const { startWriting } = pipeToNodeWritable(
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
      responseStream,
      {
        onReadyToStream() {
          if (didError) {
            status = 500
          }

          resolve(startWriting)
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
    onReadyToStream() {
      startWriting()
    },
  }
}
