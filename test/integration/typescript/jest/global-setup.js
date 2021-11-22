const { resolve } = require('path')

const { startServer } = require('../../../test-utils')

const port = 3002

module.exports = async () => {
  global.testTypescriptServer = await startServer(
    resolve(__dirname, '..'),
    port
  )
}
