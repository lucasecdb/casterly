module.exports = {
  preset: 'jest-puppeteer',
  testRegex: '\\/test\\/(.*\\.(test|spec))\\.[jt]sx?$',
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  testTimeout: 15000,
}
