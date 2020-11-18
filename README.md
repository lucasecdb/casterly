# React App Server

![CI](https://github.com/lucasecdb/react-app-server/workflows/CI/badge.svg?branch=main)

Isomorphic server rendering library for React apps.

> **Disclaimer**: the API for this library is still experimental and should be considered unstable. For production apps it is advised to use other SSR libraries such as [Next.js](https://nextjs.org) or [Remix](https://remix.run).

## Installation

To install and start using react-app-server, run the following commands

```
npm i --save react react-dom react-router@next react-router-dom@next @app-server/components @app-server/express
npm i --save-dev @app-server/cli
```

## Getting started

Then, create the files `server.js`, `app-server.jsx`, `app-browser.jsx`, `src/App.jsx`, `src/routes.js` and `src/index.jsx` with the following content:

```js
// server.js
const { createRequestHandler } = require('@app-server/express')
const express = require('express')

const app = express()

app.use(createRequestHandler())

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000')
})
```

```jsx
// app-server.jsx
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
    headers: {
      ...Object.fromEntries(headers),
      'content-type': 'text/html',
    },
  })
}
```

```jsx
// app-browser.jsx
import { RootBrowser } from '@app-server/components/browser'
import React from 'react'
import ReactDOM from 'react-dom'

import App from './src/App'

ReactDOM.hydrate(
  <RootBrowser>
    <App />
  </RootBrowser>,
  document.getElementById('root')
)
```

```jsx
// src/App.jsx
import { Routes } from '@app-server/components'

const App = () => {
  return <Routes />
}

export default App
```

```js
// src/routes.js
export default [
  {
    component: () => import('./index'),
    path: '/',
  },
]
```

```jsx
const IndexPage = () => {
  return <h1>Hello world</h1>
}

export default IndexPage
```

Now, you can start you server with `node server.js` and then, in another terminal window, run `npm run rs watch`.

## License

MIT License &copy; 2020 Lucas Cordeiro
