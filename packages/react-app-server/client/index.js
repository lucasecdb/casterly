/* @ts-check */

import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, useRoutes } from 'react-router-dom'

import { registerComponent } from './componentLoader'

import routes from '#app/routes'

window.__COMPONENTS = window.__COMPONENTS || []

const register = ([name, fn]) => registerComponent(name, fn)

window.__COMPONENTS.map(register)
window.__COMPONENTS.push = register

const start = async () => {
  const query = new URLSearchParams(window.location.search)

  const shouldHydrate =
    !query.has('nossr') || process.env.NODE_ENV === 'production'

  const method = shouldHydrate ? 'hydrate' : 'render'

  const Root = () => {
    const element = useRoutes(routes)

    return element
  }

  ReactDOM[method](
    <Router>
      <Root />
    </Router>,
    document.getElementById('root')
  )
}

start()
