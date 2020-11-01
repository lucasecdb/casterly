import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { RootContext, RootContextProvider } from './RootContext'

declare global {
  interface Window {
    __serverContext?: RootContext
  }
}

const RootBrowser: React.FC = ({ children }) => {
  const [context, setContext] = useState(window.__serverContext as RootContext)

  useEffect(() => {
    delete window.__serverContext
  }, [])

  return (
    <RootContextProvider value={context}>
      <Router>{children}</Router>
    </RootContextProvider>
  )
}

export default RootBrowser
