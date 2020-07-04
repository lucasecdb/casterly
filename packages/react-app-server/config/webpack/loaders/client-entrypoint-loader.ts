import { getOptions } from 'loader-utils'
import { loader } from 'webpack'

const clientEntrypointLoader: loader.Loader = function () {
  const { component, absolutePath } = getOptions(this)

  const componentString = JSON.stringify(component)
  const absolutePathString = JSON.stringify(absolutePath)

  return `
    (window.__COMPONENTS=window.__COMPONENTS||[]).push([${componentString}, function() {
      var mod = require(${absolutePathString})
      return mod
    }]);
  `
}

export default clientEntrypointLoader
