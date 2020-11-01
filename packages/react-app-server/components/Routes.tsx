import React from 'react'
import { useRoutes } from 'react-router'

import { useRootContext } from './RootContext'

const Routes: React.FC = () => {
  const { routes } = useRootContext()

  return useRoutes(routes)
}

export default Routes
