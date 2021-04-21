import path from 'path'

import type {
  ChunkGraph,
  Compilation,
  Dependency,
  ModuleGraph,
  NormalModule,
  sources,
} from 'webpack'
// @ts-ignore
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import paths from '../../../paths'

export default class RouteImportDependencyTemplate extends ImportDependency.Template {
  private parentCompilation

  constructor(parentCompilation: Compilation) {
    super()
    this.parentCompilation = parentCompilation
  }

  apply(
    dependency: Dependency,
    source: sources.ReplaceSource,
    templateContext: { chunkGraph: ChunkGraph; moduleGraph: ModuleGraph }
  ) {
    const { moduleGraph } = templateContext

    const parentModule = moduleGraph.getParentModule(dependency)
    const parentUserRequest = (parentModule as NormalModule).userRequest

    if (parentUserRequest !== paths.appRoutesJs) {
      return super.apply(dependency, source, templateContext)
    }

    const module = moduleGraph.getResolvedModule(dependency)
    const userRequest = (module as NormalModule).userRequest
    const moduleId =
      '.' +
      path.sep +
      path.relative(this.parentCompilation.compiler.context, userRequest)

    const start = (dependency as any).range[0] as number
    const end = ((dependency as any).range[1] as number) - 1

    // @ts-ignore: last parameter is optional
    source.replace(start, end, JSON.stringify(moduleId.toString()))
  }
}
