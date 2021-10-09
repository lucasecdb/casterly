const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3001

module.exports = async () => {
  global.testServer = await startServer(resolve(__dirname, '..'), port, {
    prod: true,
  })
}
