import type { BrowserHistory, Update } from 'history'
import { createBrowserHistory } from 'history'
// import { createPreloadForContext } from 'private-casterly-loader'
import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { RouteMatch, RouteObject, RouterProps } from 'react-router'
import { Router, matchRoutes } from 'react-router'

import type { RouteMatchWithKey, RouteObjectWithKey } from './RootContext'
import { RootContextProvider } from './RootContext'
import { RoutePendingContextProvider } from './RoutePendingContext'

// @ts-ignore
import routes from '/src/routes'

function addIndexToRoutes(routes: RouteObject[]) {
  routes.forEach((route, index) => {
    ;(route as any).key = index

    if (route.children) {
      addIndexToRoutes(route.children)
    }
  })
}

addIndexToRoutes(routes)

type RouteModule = {
  default: React.ComponentType<any>
}

type RoutePromiseComponent = {
  caseSensitive?: boolean
  component: () => Promise<RouteModule>
  path: string
  children?: RoutePromiseComponent[]
  props?: Record<string, unknown>
  key: number
}

async function mergeRoute({
  route,
  children = [],
}: {
  route: RoutePromiseComponent
  children?: RouteObjectWithKey[]
}): Promise<RouteObjectWithKey> {
  const routeComponentModule = await route.component()

  return {
    ...route,
    path: route.path,
    caseSensitive: route.caseSensitive === true,
    element: React.createElement(routeComponentModule.default, route.props),
    children,
  }
}

function mergeRouteAssetsAndRoutes(
  routePromises: RoutePromiseComponent[]
): Promise<RouteObjectWithKey[]> {
  return Promise.all(
    routePromises.map(async (route) => {
      const children = route.children
        ? await mergeRouteAssetsAndRoutes(route.children)
        : []

      return mergeRoute({
        children,
        route,
      })
    })
  )
}

let initialRoutes: RouteObjectWithKey[] | null = null
let initialRoutesError: Error | null = null

type RouteMatchPromiseComponent = RouteMatch & {
  route: RouteObject & RoutePromiseComponent
}

const initialRoutesPromise = mergeRouteAssetsAndRoutes(
  (
    (matchRoutes(routes, window.location.pathname) as
      | RouteMatchPromiseComponent[]
      | null) ?? []
  ).reduceRight<RoutePromiseComponent[]>(
    (routes, match) => [{ ...match.route, children: routes }],
    []
  )
)
  .then((matchedRoutes) => {
    initialRoutes = matchedRoutes
  })
  .catch((err) => {
    initialRoutesError = err
  })

function parseRouteMatch(
  routes: RouteObjectWithKey[],
  routeMatch: RouteMatchWithKey
): RouteObjectWithKey[] {
  return [
    {
      ...routeMatch.route,
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

  return routes.sort((routeA, routeB) => {
    return routeA.key - routeB.key
  })
}

const InternalRoot: React.FC<RouterProps & { appContext?: unknown }> = ({
  location,
  navigationType,
  navigator,
  children,
}) => {
  if (initialRoutesError != null) {
    throw initialRoutesError
  }

  if (initialRoutes == null) {
    throw initialRoutesPromise
  }

  const [context, setContext] = useState(() => {
    return {
      // ...(window.__serverContext as Omit<RootContext, 'routes'>),
      routes: initialRoutes!,
      version: '',
      matchedRoutes: [],
      matchedRoutesAssets: [],
      mainAssets: [],
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
      try {
        const path =
          typeof location === 'string' ? location : location.pathname!

        const matchedRoutes = (
          (matchRoutes(routes, path) as RouteMatchPromiseComponent[] | null) ??
          []
        ).reduceRight<RoutePromiseComponent[]>(
          (routes, match) => [{ ...match.route, children: routes }],
          []
        )

        const newRoutes = await mergeRouteAssetsAndRoutes(matchedRoutes)

        if (cancelled) {
          return
        }

        setContext((prevContext) => ({
          ...prevContext,
          routes: mergeRoutes(prevContext.routes, newRoutes),
        }))
        setStateLocation(location)
        setRoutePending(false)
      } catch {
        setStateLocation(location)
        setRoutePending(false)
      }
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
    <Suspense fallback={null}>
      <InternalRoot
        navigationType={state.action}
        location={state.location}
        navigator={history}
        appContext={appContext}
      >
        {children}
      </InternalRoot>
    </Suspense>
  )
}
