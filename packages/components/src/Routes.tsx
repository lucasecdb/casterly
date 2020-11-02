import React from 'react'
import { useRoutes } from 'react-router'

import { useRootContext } from './RootContext'

export const Routes: React.FC = () => {
  const { serverRoutes } = useRootContext()

  const element = useRoutes(serverRoutes)

  return <>{element}</>
}
