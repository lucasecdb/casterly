import * as path from 'path'

import { ConcatenationScope, Template } from 'webpack'

export default function (this: any, source: string) {
  const rootContextRelativePath = JSON.stringify(
    '.' + path.sep + path.relative(this.rootContext, this.resourcePath)
  )

  return Template.asString([
    source,
    ';(window.__COMPONENTS = window.__COMPONENTS || []).push([',
    Template.indent(rootContextRelativePath) + ',',
    Template.indent([
      'function () {',
      Template.indent(['return ' + ConcatenationScope.DEFAULT_EXPORT]),
      '}',
    ]),
    '])',
  ])
}
