import * as fs from 'fs'
import * as path from 'path'

export const routeModuleExts = ['.js', '.ts', '.jsx', '.tsx']

function isRouteModule(file: string) {
  return routeModuleExts.includes(path.extname(file))
}

export interface ConfigRoute {
  path: string
  file: string
  children?: ConfigRoute[]
  id: string
  parentId?: string
  index?: boolean
}

/**
 * Construct a tree of routes given a list of route file paths and a
 * base directory
 *
 * Example:
 *
 *   let routes = contructRoutesTree(
 *      [
 *        'src/routes/index.tsx',
 *        'src/routes/links.tsx',
 *      ],
 *      'src/routes'
 *   )
 *
 *   console.log(routes)
 *   // [
 *   //   { path: '/', file: 'src/routes/index.tsx' },
 *   //   { path: '/links', file: 'src/routes/links.tsx' },
 *   // ]
 */
export function constructRoutesTree(srcDir: string) {
  const files: Record<string, string> = {}

  visitFiles(path.join(srcDir, 'routes'), (file) => {
    if (isRouteModule(file)) {
      const routeId = createRouteId(path.join('routes', file))
      files[routeId] = path.join('routes', file)
      return
    }
  })

  const routeIds = Object.keys(files)

  function createRoutesTree(parentId?: string | undefined): ConfigRoute[] {
    const childRoutes = routeIds.filter(
      (id) => findParentRoute(routeIds, id) === parentId
    )

    const routes = []

    for (const routeId of childRoutes) {
      const routePath = createRoutePath(
        routeId.slice((parentId || 'routes').length + 1)
      )

      const route: ConfigRoute = {
        id: routeId,
        parentId,
        path: routePath,
        file: files[routeId],
        children: createRoutesTree(routeId),
      }

      const isIndexFile = routeId.endsWith('/index')

      if (isIndexFile) {
        route.index = true

        routes.push(route)
      } else {
        routes.push(route)
      }
    }

    return routes
  }

  return { routes: createRoutesTree(), files: Object.values(files) }
}

function createRoutePath(routePath: string) {
  let result = routePath

  if (routePath.endsWith('index')) {
    result = routePath.replace(/\/?index$/, '')
  }

  return result
}

function findParentRoute(routeIds: string[], childRouteId: string) {
  return routeIds.find((routeId) => childRouteId.startsWith(`${routeId}/`))
}

function createRouteId(routeId: string) {
  return removeWindowsSeparator(removeFileExtension(routeId))
}

function removeWindowsSeparator(routeId: string) {
  return routeId.split(path.win32.sep).join('/')
}

function removeFileExtension(routeId: string) {
  return routeId.replace(/\.\w+$/, '')
}

function visitFiles(
  dir: string,
  callback: (file: string) => void,
  baseDir = dir
) {
  const files = fs.readdirSync(dir)

  for (const filename of files) {
    const file = path.resolve(dir, filename)
    const stat = fs.lstatSync(file)

    if (stat.isDirectory()) {
      visitFiles(file, callback, baseDir)
    } else {
      callback(path.relative(baseDir, file))
    }
  }
}
