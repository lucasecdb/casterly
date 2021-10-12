# Casterly

![CI](https://github.com/lucasecdb/casterly/workflows/CI/badge.svg?branch=main)

Isomorphic server rendering library for React apps.

> **Disclaimer**: the API for this library is still experimental and should be considered unstable. For production apps it is advised to use other SSR libraries such as [Next.js](https://nextjs.org) or [Remix](https://remix.run).

## Installation

To install and start using Casterly, run the following commands

```sh
npm i --save-dev casterly
npm i --save react \
  react-dom \
  react-router@next \
  react-router-dom@next \
  @casterly/components \
  @casterly/express
```

## Getting started

To start developing with Casterly, you need to create a few files with the following content:

```js
// server.js
const { createRequestHandler } = require('@casterly/express')
const express = require('express')

const app = express()

app.use(createRequestHandler())

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000')
})
```

This file is your app entrypoint, you have full control over the server and can add any other express middlewares you'd like or need.

```jsx
// src/app-server.jsx
import { Scripts, Styles } from '@casterly/components'
import { RootServer } from '@casterly/components/server'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'

import App from './App'

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

export default function handleRequest(
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
        <Document />
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
        }
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
```

This file contains your SSR entrypoint, you can render you HTML however you'd like and place your scripts in either the `<head>` or `<body>` section according to your needs. You should **always** render you root component in this file wrapped in the `<RootServer>` component, passing in the required props as above, else your app won't work correctly.

```jsx
// src/app-browser.jsx
import { RootBrowser } from '@casterly/components/browser'
import React from 'react'
import ReactDOM from 'react-dom'

import App from './App'

ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <RootBrowser>
    <App />
  </RootBrowser>
)
```

This is the same as the above, but for the browser. You can choose to use either `ReactDOM.hydrate` or the new (unstable) `ReactDOM.unstable_createRoot` to opt-in React's [concurrent mode](https://reactjs.org/docs/concurrent-mode-intro.html). Similar to its server counterpart, you should **always** render your app wrapped in the `<RootBrowser>` component.

```jsx
// src/App.jsx
import { Routes } from '@casterly/components'

const App = () => {
  return <Routes />
}

export default App
```

This is you root component, where you should place any components that is common in every page of your app, such as Redux or Apollo's context providers.

```js
// src/routes.js
export default [
  {
    component: () => import('./index'),
    path: '/',
  },
]
```

The `routes.js` file is where you should add your app routes. It follows a similar format to [React Router's object-based routes config](https://github.com/ReactTraining/react-router/blob/dev/docs/api-reference.md#useroutes) (because we use React Router under the hood), but instead of adding your component directly into this file, you should pass in a *function* that returns a Promise that resolves to the module of that route's component. You can use React Router hooks to get routes parameters and to navigate to other routes. For more information, check their docs.

```jsx
const IndexPage = () => {
  return <h1>Hello world</h1>
}

export default IndexPage
```

Last but not least, you have your index page component, which is now only rendering the default "hello world" message.

Now, you can start you server by running `node server.js` and, in another terminal window, running `npm run casterly watch`. Your app will be running in localhost in the port 3000. The `casterly watch` command will spin up a *build server* that will build your app into a bundle that we can serve in the browser, which your app server (the one in `server.js`) will use during development and production to render the app.

## License

For the license, check the [LICENSE](./LICENSE) file.
