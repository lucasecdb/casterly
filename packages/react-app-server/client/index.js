import React from 'react'
import ReactDOM from 'react-dom'

import Component from '#app/index'

const query = new URLSearchParams(window.location.search)

const shouldHydrate =
  !query.has('nossr') || process.env.NODE_ENV === 'production'

const method = shouldHydrate ? 'hydrate' : 'render'

ReactDOM[method](<Component />, document.getElementById('root'))
