/* @ts-check */

import routes from '_app/routes'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, useRoutes } from 'react-router-dom'

import { loadComponent, registerComponent } from './componentLoader'

window.__COMPONENTS = window.__COMPONENTS || []

const register = ([name, fn]) => registerComponent(name, fn)

window.__COMPONENTS.map(register)
window.__COMPONENTS.push = register

const start = async () => {
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
