import React from 'react'
import { useRoutes } from 'react-router'

import { useRootContext } from './RootContext'

export const Routes: React.FC = () => {
  const { routes } = useRootContext()

  const element = useRoutes(routes)

  return <>{element}</>
}
