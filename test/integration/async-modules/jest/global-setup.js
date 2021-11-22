const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3004

module.exports = async () => {
  global.testAsyncModulesServer = await startServer(
    resolve(__dirname, '..'),
    port
  )
}
