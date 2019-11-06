import React from 'react'
import { Helmet } from 'react-app-server/head'

import 'tachyons/css/tachyons.css'

const ErrorPage = ({ error }) => {
  return (
    <div className="flex flex-column items-center helvetica">
      <Helmet title="Rendering Error" />
      <div className="bg-light-red ph4 white w-100 overflow-x-auto">
        <h1>${error.message}</h1>
        <pre>${error.stack}</pre>
      </div>
    </div>
  )
}

export default ErrorPage
