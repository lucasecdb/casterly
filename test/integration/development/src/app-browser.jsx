import { Routes } from '@casterly/components'
import { RootBrowser } from '@casterly/components/browser'
import React from 'react'
import ReactDOM from 'react-dom'

ReactDOM.render(
  <RootBrowser>
    <Routes />
  </RootBrowser>,
  document.getElementById('root')
)
