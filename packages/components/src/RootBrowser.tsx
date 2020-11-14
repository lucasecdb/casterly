import { BrowserHistory, Update, createBrowserHistory } from 'history'
import React, {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Router, RouterProps } from 'react-router'

import {
  RootContext,
  RootContextProvider,
  RouteMatchWithKey,
  RouteObjectWithKey,
} from './RootContext'
import { RoutePendingContextProvider } from './RoutePendingContext'

declare global {
  interface Window {
    __serverContext?: Omit<RootContext, 'routes'>
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  function __webpack_require__(assetPath: string): any
}

const parseRouteMatch = (
  routes: RouteObjectWithKey[],
  routeMatch: RouteMatchWithKey
): RouteObjectWithKey[] => {
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
  currentRoutes: RouteObjectWithKey[],
  newRoutes: RouteObjectWithKey[]
) => {
  const routes: RouteObjectWithKey[] = []

  currentRoutes.forEach((route) => {
    const newRoute = newRoutes.find(({ key }) => route.key === key)

    const children = newRoute
      ? mergeRoutes(route.children ?? [], newRoute.children ?? [])
      : route.children

    routes.push({
      ...route,
      children,
    })
  })

  newRoutes.forEach((newRoute) => {
    if (currentRoutes.find(({ key }) => newRoute.key === key)) {
      return
    }

    routes.push(newRoute)
  })

  return routes.sort((routeA, routeB) => routeA.key - routeB.key)
}

const InternalRoot: React.FC<RouterProps> = ({
  location,
  action,
  navigator,
  children,
}) => {
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

  const [stateLocation, setStateLocation] = useState(location)
  const [routePending, setRoutePending] = useState(false)

  const prevLocationRef = useRef(location)

  useEffect(() => {
    if (prevLocationRef.current === location) {
      return
    }

    prevLocationRef.current = location

    let cancelled = false

    setRoutePending(true)

    fetch(
      `/__route-manifest?${new URLSearchParams({
        path: location.pathname,
        v: context.version ?? '',
      })}`
    )
      .then((res) => res.json())
      .then((routeClientContext: Omit<RootContext, 'routes'>) => {
        if (cancelled) {
          return
        }

        const scriptAssets = routeClientContext.matchedRoutesAssets.filter(
          (file) => file.endsWith('.js')
        )
        const styleAssets = routeClientContext.matchedRoutesAssets.filter(
          (file) => file.endsWith('.css')
        )

        Promise.all(
          scriptAssets
            .map((scriptAsset) => {
              if (document.querySelector(`script[src="${scriptAsset}"]`)) {
                return Promise.resolve()
              }

              const script = document.createElement('script')

              return new Promise((resolve, reject) => {
                script.src = scriptAsset
                script.defer = true
                script.onload = resolve
                script.onerror = reject

                document.body.appendChild(script)
              })
            })
            .concat(
              styleAssets.map((styleAsset) => {
                if (document.querySelector(`link[href="${styleAsset}"]`)) {
                  return Promise.resolve()
                }

                const link = document.createElement('link')

                return new Promise((resolve, reject) => {
                  link.href = styleAsset
                  link.type = 'text/css'
                  link.rel = 'stylesheet'
                  link.onload = resolve
                  link.onerror = reject

                  document.head.appendChild(link)
                })
              })
            )
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
          setStateLocation(location)
          setRoutePending(false)
        })
      })
      .catch(() => {
        setStateLocation(location)
        setRoutePending(false)
      })

    return () => {
      cancelled = true
    }
  }, [location])

  return (
    <RootContextProvider value={context}>
      <RoutePendingContextProvider value={routePending}>
        <Router action={action} location={stateLocation} navigator={navigator}>
          {children}
        </Router>
      </RoutePendingContextProvider>
    </RootContextProvider>
  )
}

export const RootBrowser: React.FC = ({ children }) => {
  const historyRef = useRef<BrowserHistory>()
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory()
  }

  const history = historyRef.current
  const [state, dispatch] = useReducer((_: Update, action: Update) => action, {
    action: history.action,
    location: history.location,
  })

  useLayoutEffect(() => history.listen(dispatch), [history])

  return (
    <InternalRoot
      action={state.action}
      location={state.location}
      navigator={history}
    >
      {children}
    </InternalRoot>
  )
}
