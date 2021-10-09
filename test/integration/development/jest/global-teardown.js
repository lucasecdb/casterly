const { killServer } = require('../../../test-utils')

module.exports = async () => {
  await killServer(global.testDevServer)
}
