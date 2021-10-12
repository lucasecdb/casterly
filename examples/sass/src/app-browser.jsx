import { Routes } from '@casterly/components'
import { RootBrowser } from '@casterly/components/browser'
import React from 'react'
import ReactDOM from 'react-dom'
import 'tailwindcss/tailwind.css'

ReactDOM.hydrate(
  <RootBrowser>
    <Routes />
  </RootBrowser>,
  document.getElementById('root')
)
