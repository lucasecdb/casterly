import path from 'path'

import type {
  ChunkGraph,
  Dependency,
  ModuleGraph,
  NormalModule,
  sources,
} from 'webpack'
// @ts-ignore
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import paths from '../../../paths'

export default class RouteModuleIdCollectorImportDependencyTemplate extends ImportDependency.Template {
  private routeImportModuleIdMap
  private compilerContext

  constructor(
    routeImportModuleIdMap: Map<string, string | number>,
    compilerContext: string
  ) {
    super()
    this.routeImportModuleIdMap = routeImportModuleIdMap
    this.compilerContext = compilerContext
  }

  apply(
    dependency: Dependency,
    source: sources.ReplaceSource,
    templateContext: { chunkGraph: ChunkGraph; moduleGraph: ModuleGraph }
  ) {
    super.apply(dependency, source, templateContext)

    const { moduleGraph, chunkGraph } = templateContext

    const parentModule = moduleGraph.getParentModule(dependency)
    const parentUserRequest = (parentModule as NormalModule).userRequest

    if (parentUserRequest !== paths.appRoutesJs) {
      return
    }

    const module = moduleGraph.getResolvedModule(dependency)
    const userRequest = (module as NormalModule).userRequest
    const modulePath =
      '.' + path.sep + path.relative(this.compilerContext, userRequest)

    const moduleId = chunkGraph.getModuleId(moduleGraph.getModule(dependency))

    this.routeImportModuleIdMap.set(modulePath, moduleId)
  }
}
