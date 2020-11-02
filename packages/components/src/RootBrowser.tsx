import React, { useEffect, useRef, useState } from 'react'
import { RouteMatch, RouteObject } from 'react-router'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'

import { RootContext, RootContextProvider } from './RootContext'

declare global {
  interface Window {
    __serverContext?: Omit<RootContext, 'routes'>
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

const mergeRoutes = (
  currentRoutes: RouteObject[],
  newRoutes: RouteObject[]
) => {
  const routes: RouteObject[] = []

  currentRoutes.forEach((route) => {
    const newRoute = newRoutes.find(({ path }) => route.path === path)

    const children = newRoute
      ? mergeRoutes(route.children ?? [], newRoute.children ?? [])
      : route.children

    routes.push({
      ...route,
      children,
    })
  })

  newRoutes.forEach((newRoute) => {
    if (currentRoutes.find(({ path }) => newRoute.path === path)) {
      return
    }

    routes.push(newRoute)
  })

  return routes
}

const Root: React.FC = ({ children }) => {
  const [context, setContext] = useState(() => {
    const routes =
      window.__serverContext?.matchedRoutes.reduceRight(parseRouteMatch, []) ??
      []

    return {
      ...(window.__serverContext as Omit<RootContext, 'routes'>),
      routes,
    }
  })

  useEffect(() => {
    delete window.__serverContext
  }, [])

  const location = useLocation()

  const prevLocationRef = useRef(location)

  useEffect(() => {
    if (prevLocationRef.current === location) {
      return
    }

    prevLocationRef.current = location

    let cancelled = false

    fetch(`/__route-manifest?path=${location.pathname}`)
      .then((res) => res.json())
      .then((routeClientContext: Omit<RootContext, 'routes'>) => {
        if (cancelled) {
          return
        }

        Promise.all(
          routeClientContext.matchedRoutesAssets.map((asset) => {
            if (document.querySelector(`script[src="${asset}"]`)) {
              return Promise.resolve()
            }

            const script = document.createElement('script')

            return new Promise((resolve, reject) => {
              script.src = asset
              script.defer = true
              script.onload = resolve
              script.onerror = reject

              document.head.appendChild(script)
            })
          })
        ).then(() => {
          if (cancelled) {
            return
          }

          const routes = routeClientContext.matchedRoutes.reduceRight(
            parseRouteMatch,
            []
          )

          setContext((prevContext) => ({
            ...prevContext,
            routes: mergeRoutes(prevContext.routes, routes),
          }))
        })
      })

    return () => {
      cancelled = true
    }
  }, [location])

  return <RootContextProvider value={context}>{children}</RootContextProvider>
}

export const RootBrowser: React.FC = ({ children }) => {
  return (
    <Router>
      <Root>{children}</Root>
    </Router>
  )
}
