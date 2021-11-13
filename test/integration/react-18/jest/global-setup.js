const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3003

module.exports = async () => {
  global.testReact18Server = await startServer(resolve(__dirname, '..'), port)
}
