module.exports = (webpackConfig, { isServer }) => {
  if (isServer) {
    webpackConfig.externals = [
      {
        'async-dep': 'promise Promise.resolve("text/html")',
      },
      ...webpackConfig.externals,
    ]
  }
  return webpackConfig
}
