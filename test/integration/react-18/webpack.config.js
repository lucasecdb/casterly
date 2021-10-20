module.exports = (config) => {
  const alias = { ...config.resolve.alias }

  // FIXME: resolving react/jsx-runtime https://github.com/facebook/react/issues/20235
  alias['react/jsx-dev-runtime'] = require.resolve('react/jsx-dev-runtime.js')
  alias['react/jsx-runtime'] = require.resolve('react/jsx-runtime.js')

  alias['react'] = 'react-18'
  alias['react-dom'] = 'react-dom-18'

  config.resolve.alias = alias

  return config
}
