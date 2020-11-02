import React, { useEffect, useState } from 'react'
import { RouteMatch, RouteObject } from 'react-router'
import { BrowserRouter as Router } from 'react-router-dom'

import { RootContext, RootContextProvider } from './RootContext'
import { RoutesProvider } from './RoutesBrowser'

declare global {
  interface Window {
    __serverContext?: Omit<RootContext, 'serverRoutes'>
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  function __webpack_require__(assetPath: string): any
}

const parseRouteMatch = (
  routes: RouteObject[],
  routeMatch: RouteMatch
): RouteObject[] => {
  const { route } = routeMatch

  const routeEntrypoint = (route as any).componentName as string

  const { default: Component } = __webpack_require__(routeEntrypoint) as {
    default: React.ComponentType
  }

  return [
    {
      ...route,
      element: <Component />,
      children: routes,
    },
  ]
}

export const RootBrowser: React.FC = ({ children }) => {
  const [context, setContext] = useState(window.__serverContext as RootContext)
  const [routes, setRoutes] = useState(() => {
    return (
      window.__serverContext?.matchedRoutes.reduceRight(parseRouteMatch, []) ??
      []
    )
  })

  useEffect(() => {
    delete window.__serverContext
  }, [])

  return (
    <RootContextProvider value={context}>
      <RoutesProvider value={routes}>
        <Router>{children}</Router>
      </RoutesProvider>
    </RootContextProvider>
  )
}
