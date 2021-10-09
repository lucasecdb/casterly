const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3000

module.exports = async () => {
  global.testServer = await startServer(resolve(__dirname, '..'), port)
}
