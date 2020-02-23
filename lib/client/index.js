import React from 'react'
import ReactDOM from 'react-dom'

import { loadComponent, registerComponent } from './component-loader'

window.__COMPONENTS = window.__COMPONENTS || []

const register = ([name, fn]) => registerComponent(name, fn)

window.__COMPONENTS.map(register)
window.__COMPONENTS.push = register

const start = async () => {
  const query = new URLSearchParams(window.location.search)

  const { componentName, props = {} } = window.__DATA__

  const shouldHydrate =
    !query.has('nossr') || process.env.NODE_ENV === 'production'

  const method = shouldHydrate ? 'hydrate' : 'render'

  const { component: Component } = await loadComponent(componentName)

  ReactDOM[method](<Component {...props} />, document.getElementById('root'))
}

start()
