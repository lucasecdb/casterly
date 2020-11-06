import { Routes } from '@app-server/components'
import { RootBrowser } from '@app-server/components/browser'
import React from 'react'
import ReactDOM from 'react-dom'

const App: React.FC = () => {
  return <Routes />
}

ReactDOM.hydrate(
  <RootBrowser>
    <App />
  </RootBrowser>,
  document.getElementById('root')
)
