/* @ts-check */

import routes from '_app/routes'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, useRoutes } from 'react-router-dom'

import { loadComponent } from './componentLoader'

const start = async () => {
  if (process.env.NODE_ENV === 'development') {
    const { connectHMR } = require('./hot')

    connectHMR()
  }

  const data = window.__DATA__

  if ('error' in (data.props ?? {})) {
    const { component: ErrorComponent } = await loadComponent('error')

    ReactDOM.hydrate(
      <ErrorComponent {...data.props} />,
      document.getElementById('root')
    )
    return
  }

  const Root = () => {
    const element = useRoutes(routes)

    return element
  }

  ReactDOM.hydrate(
    <Router>
      <Root />
    </Router>,
    document.getElementById('root')
  )
}

start()
