module.exports = {
  env: {
    jest: true,
  },
  parserOptions: {
    project: './tsconfig.test.json',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
}
