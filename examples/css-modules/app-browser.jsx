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
