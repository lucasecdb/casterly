import type { BrowserHistory, Update } from 'history'
import { createBrowserHistory } from 'history'
import React, {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { RouterProps } from 'react-router'
import { Router } from 'react-router'

import type {
  RootContext,
  RouteMatchWithKey,
  RouteObjectWithKey,
} from './RootContext'
import { RootContextProvider } from './RootContext'
import { RoutePendingContextProvider } from './RoutePendingContext'

declare global {
  interface Window {
    __serverContext?: Omit<RootContext, 'routes'>
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  function __webpack_require__(assetPath: string): any

  const __webpack_public_path__: string
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
      element: <Component {...route.props} />,
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

const addScript = (scriptAsset: string) => {
  const url =
    __webpack_public_path__ +
    // remove leading slash
    scriptAsset.slice(1)

  if (document.querySelector(`script[src="${url}"]`)) {
    return Promise.resolve()
  }

  const script = document.createElement('script')

  return new Promise((resolve, reject) => {
    script.src = url
    script.defer = true
    script.onload = resolve
    script.onerror = reject

    document.body.appendChild(script)
  })
}

const addStylesheet = (styleAsset: string) => {
  const url =
    __webpack_public_path__ +
    // remove leading slash
    styleAsset.slice(1)

  if (document.querySelector(`link[href="${url}"]`)) {
    return Promise.resolve()
  }

  const link = document.createElement('link')

  return new Promise((resolve, reject) => {
    link.href = url
    link.type = 'text/css'
    link.rel = 'stylesheet'
    link.onload = resolve
    link.onerror = reject

    document.head.appendChild(link)
  })
}

const fetchRouteData = async (path: string, version: string | null) => {
  const res = await fetch(
    `/_casterly/route-manifest?${new URLSearchParams({
      path,
      v: version ?? '',
    })}`
  )

  const resEtag = res.headers.get('Etag')?.match(/W\/"(.*)"/)?.[1] ?? null

  if (res.status === 200 && resEtag === version) {
    return res.json() as Promise<Omit<RootContext, 'routes'>>
  }

  return null
}

const fetchRouteAssets = async (
  path: string,
  version: string | null,
  reloadOnMismatch = true
) => {
  const routeClientContext = await fetchRouteData(path, version)

  if (!routeClientContext && reloadOnMismatch) {
    window.location.reload()
    return { routes: [] }
  } else if (!routeClientContext) {
    return { routes: [] }
  }

  const scriptAssets = routeClientContext.matchedRoutesAssets.filter((file) =>
    file.endsWith('.js')
  )
  const styleAssets = routeClientContext.matchedRoutesAssets.filter((file) =>
    file.endsWith('.css')
  )

  await Promise.all(
    scriptAssets.map(addScript).concat(styleAssets.map(addStylesheet))
  )

  const routes = routeClientContext.matchedRoutes.reduceRight(
    parseRouteMatch,
    []
  )

  return { routes }
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
        const { routes } = await fetchRouteAssets(
          typeof location === 'string' ? location : location.pathname!,
          context.version
        )

        if (cancelled) {
          return
        }

        setContext((prevContext) => ({
          ...prevContext,
          routes: mergeRoutes(prevContext.routes, routes),
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
  }, [location, context.version])

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
