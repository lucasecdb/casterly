import React from 'react'
import ReactDOM from 'react-dom'

const query = new URLSearchParams(window.location.search)

const { componentName } = window.__DATA__

const shouldHydrate =
  !query.has('nossr') || process.env.NODE_ENV === 'production'

const method = shouldHydrate ? 'hydrate' : 'render'

const componentModule = require('private-client-components/' + componentName)

console.log(componentModule)

const Component = componentModule.default || componentModule

ReactDOM[method](<Component />, document.getElementById('root'))
