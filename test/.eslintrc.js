const path = require('path')

module.exports = {
  env: {
    jest: true,
  },
  parserOptions: {
    project: path.resolve(__dirname, '..', 'tsconfig.test.json'),
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
}
