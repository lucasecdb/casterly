export type Route = {
  component: () => string
  path: string
  children?: Route[]
}

export type RouteWithAssets = {
  component: string[]
  path: string
  children?: RouteWithAssets[]
}

export const createRouteComponentsParser = (
  routeComponentsAssets: Record<string, string[]>
) => {
  const parseRouteComponents = (route: Route): RouteWithAssets => {
    const routeWithComponents: RouteWithAssets = {
      ...route,
      component: routeComponentsAssets[route.component()],
      children: undefined,
    }

    if (routeWithComponents.children) {
      routeWithComponents.children = route.children
        ? route.children.map(parseRouteComponents)
        : undefined
    }

    return routeWithComponents
  }

  return parseRouteComponents
}
