const path = require('path')

module.exports = {
  overrides: [
    {
      files: ['./**/*'],
      excludedFiles: ['./**/*.jsx', './**/*.tsx'],
      parserOptions: {
        project: path.resolve(__dirname, 'tsconfig.cli.json'),
      },
    },
    {
      files: ['./**/*.jsx', './**/*.tsx'],
      parserOptions: {
        project: path.resolve(__dirname, 'tsconfig.jsx.json'),
      },
    },
  ],
}
