'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./lib/server/defaultServer')
} else {
  module.exports = require('./lib/server/devServer')
}
