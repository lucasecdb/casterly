const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3000

module.exports = async () => {
  global.testDevServer = await startServer(resolve(__dirname, '..'), port)
}
