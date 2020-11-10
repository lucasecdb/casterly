import NativeModule from 'module'

export function evalModuleCode(
  context: string,
  code: string,
  filename: string
) {
  const module = new NativeModule(filename)

  // @ts-ignore: private method
  module.paths = NativeModule._nodeModulePaths(context)
  module.filename = filename
  // @ts-ignore: private method
  module._compile(code, filename)

  return module.exports
}

export type RouteAssetComponent = {
  caseSensitive?: boolean
  component: () => string
  path: string
  children?: RouteAssetComponent[]
}

export type RouteWithAssets = {
  caseSensitive?: boolean
  assets: string[]
  componentName: string | number
  path: string
  children?: RouteWithAssets[]
}

export type RoutesManifest = ReturnType<typeof parseRoutesAndAssets>

export const parseRoutesAndAssets = (
  mainAssets: string[],
  routeComponentsAssets: Record<string, string[]>,
  routes: RouteAssetComponent[],
  routeModuleIdMap: Map<string, string | number>
) => {
  const parseRouteComponents = (
    route: RouteAssetComponent
  ): RouteWithAssets => {
    const moduleId = routeModuleIdMap.get(route.component())!

    const routeWithComponents: RouteWithAssets = {
      caseSensitive: route.caseSensitive,
      path: route.path,
      assets: routeComponentsAssets[moduleId],
      componentName: moduleId,
      children: undefined,
    }

    if (route.children) {
      routeWithComponents.children = route.children
        ? route.children.map(parseRouteComponents)
        : undefined
    }

    return routeWithComponents
  }

  const routesWithAssets = routes.map(parseRouteComponents)

  return { main: mainAssets, routes: routesWithAssets }
}
