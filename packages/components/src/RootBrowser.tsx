import type { RouteModule } from '@casterly/core'
import type { BrowserHistory, Update } from 'history'
import { createBrowserHistory } from 'history'
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { RouterProps } from 'react-router'
import { Router } from 'react-router'

import type { RootContext, RouteMatchWithKey, RouteObject } from './RootContext'
import { RootContextProvider } from './RootContext'
import { RoutePendingContextProvider } from './RoutePendingContext'

declare global {
  interface Window {
    __serverContext: Omit<RootContext, 'routes'>
    __routeModules: Record<string, RouteModule>
  }
}

const mergeRoutes = (
  currentRoutes: RouteObject[],
  newRoutes: RouteObject[]
) => {
  const routes: RouteObject[] = []

  currentRoutes.forEach((route) => {
    const newRoute = newRoutes.find(({ id }) => route.id === id)

    const children = newRoute
      ? mergeRoutes(route.children ?? [], newRoute.children ?? [])
      : route.children

    routes.push({
      ...route,
      children,
    })
  })

  newRoutes.forEach((newRoute) => {
    if (currentRoutes.find(({ id }) => newRoute.id === id)) {
      return
    }

    routes.push(newRoute)
  })

  return routes
}

const InternalRoot: React.FC<RouterProps & { appContext?: unknown }> = ({
  location,
  navigationType,
  navigator,
  children,
}) => {
  const initialRoutes = useMemo(() => {
    return window.__serverContext.matchedRoutes.reduceRight<RouteObject[]>(
      (routes, match) => [
        {
          ...match.route,
          module: window.__routeModules[match.route.id],
          children: routes,
        },
      ],
      []
    )
  }, [])

  const [context, setContext] = useState(() => {
    return {
      ...window.__serverContext,
      routes: initialRoutes,
    }
  })

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

    const handleRouteChange = async () => {
      const result = await fetch(
        `/_casterly/route-manifest.json?path=${encodeURIComponent(
          (location as Location).pathname
        )}`
      ).then((res) => res.json() as Promise<Omit<RootContext, 'routes'>>)

      await Promise.all(
        result.matchedRoutes.map((match) =>
          import(/* @vite-ignore */ '/' + match.route.file).then((exports) => {
            window.__routeModules[match.route.id] = exports
          })
        )
      )

      const newRoutes = (
        result.matchedRoutes as RouteMatchWithKey[]
      ).reduceRight<RouteObject[]>(
        (routes, match) => [
          {
            ...match.route,
            module: window.__routeModules[match.route.id],
            children: routes,
          },
        ],
        []
      )

      if (cancelled) {
        return
      }

      setContext((prevContext) => ({
        ...prevContext,
        routes: mergeRoutes(prevContext.routes, newRoutes),
      }))

      setStateLocation(location)
    }

    handleRouteChange()

    return () => {
      cancelled = true
    }
  }, [context.version, location])

  return (
    <RootContextProvider value={context}>
      <RoutePendingContextProvider value={routePending}>
        <Router
          navigationType={navigationType}
          location={stateLocation}
          navigator={navigator}
        >
          {children}
        </Router>
      </RoutePendingContextProvider>
    </RootContextProvider>
  )
}

export const RootBrowser: React.FC<{ appContext?: unknown }> = ({
  appContext,
  children,
}) => {
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
      navigationType={state.action}
      location={state.location}
      navigator={history}
      appContext={appContext}
    >
      {children}
    </InternalRoot>
  )
}
