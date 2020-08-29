import React from 'react'
import { Link } from 'react-app-server/router'

const App = () => {
  return (
    <>
      <p>Hello world!</p>
      <Link to="/other-page">Go to other page</Link>
    </>
  )
}

export default App
