const path = require('path')

module.exports = {
  preset: 'jest-puppeteer',
  testRegex: '\\/test\\/(.*\\.(test|spec))\\.[jt]sx?$',
  transform: {
    '^.+\\.(js|ts)$': path.resolve(__dirname, 'jest', 'babelTransform.js'),
  },
  testTimeout: 10000,
}
