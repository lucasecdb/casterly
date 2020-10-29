import { ChunkGraph, Dependency } from 'webpack'
import type { sources } from 'webpack'
// @ts-ignore
import ImportDependency from 'webpack/lib/dependencies/ImportDependency'

import * as paths from '../../paths'

export default class RouteImportDependencyTemplate extends ImportDependency.Template {
  apply(
    dependency: Dependency,
    source: sources.ReplaceSource,
    templateContext: { chunkGraph: ChunkGraph }
  ) {
    const { chunkGraph } = templateContext

    const parentModule = chunkGraph.moduleGraph.getParentModule(dependency)
    const parentUserRequest = (parentModule as any).userRequest as string

    if (parentUserRequest !== paths.appRoutesJs) {
      return super.apply(dependency, source, templateContext)
    }

    const module = chunkGraph.moduleGraph.getModule(dependency)
    const userRequest = (module as any).userRequest as string

    const start = (dependency as any).range[0] as number
    const end = ((dependency as any).range[1] as number) - 1

    // @ts-ignore: last parameter is optional
    source.replace(start, end, JSON.stringify(userRequest))
  }
}
