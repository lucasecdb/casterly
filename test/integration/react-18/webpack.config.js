module.exports = (config) => {
  const alias = {
    ...config.resolve.alias,
    react: 'react-18',
    'react-dom': 'react-dom-18',
  }

  config.resolve.alias = alias

  return config
}
