const { killServer } = require('../../../test-utils')

module.exports = async () => {
  await killServer(global.testReact18Server)
}
