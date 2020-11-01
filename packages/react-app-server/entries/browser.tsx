/* eslint-disable import/order */
import React from 'react'
import ReactDOM from 'react-dom'

import Routes from '../components/Routes'
import RootBrowser from '../components/RootBrowser'

const App: React.FC = () => {
  return <Routes />
}

ReactDOM.hydrate(
  <RootBrowser>
    <App />
  </RootBrowser>,
  document.getElementById('app')
)
