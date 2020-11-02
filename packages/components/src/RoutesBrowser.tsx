import React, { useContext } from 'react'
import { RouteObject, useRoutes } from 'react-router'

const ctx = React.createContext<RouteObject[] | null>(null)

export const RoutesProvider: React.FC<{ value: RouteObject[] }> = ({
  value,
  children,
}) => {
  return <ctx.Provider value={value}>{children}</ctx.Provider>
}

export const Routes: React.FC = () => {
  const routes = useContext(ctx) ?? []

  return useRoutes(routes)
}
