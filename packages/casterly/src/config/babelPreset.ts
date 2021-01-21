interface BabelPresetOptions {
  'preset-env'?: any
  'preset-typescript'?: any
  'preset-react'?: any
}

export default (api: any, options: BabelPresetOptions = {}) => {
  const useJsxRuntime =
    options['preset-react']?.runtime === 'automatic' ||
    (Boolean(api.caller((caller: any) => !!caller && caller.hasJsxRuntime)) &&
      options['preset-react']?.runtime !== 'classic')

  return {
    sourceType: 'unambiguous',
    presets: [
      [require.resolve('@babel/preset-env'), options['preset-env']],
      [
        require.resolve('@babel/preset-typescript'),
        options['preset-typescript'],
      ],
      [
        require.resolve('@babel/preset-react'),
        {
          ...options['preset-react'],
          runtime: useJsxRuntime ? 'automatic' : 'classic',
        },
      ],
    ],
    plugins: [
      require.resolve('@babel/plugin-transform-runtime'),
      require.resolve('@babel/plugin-proposal-class-properties'),
      require.resolve('@babel/plugin-syntax-dynamic-import'),
    ].filter(Boolean),
  }
}
