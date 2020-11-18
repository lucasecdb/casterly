import React from 'react'

import { useRootContext } from './RootContext'

export const Styles: React.FC = () => {
  const { matchedRoutesAssets, mainAssets } = useRootContext()

  return (
    <>
      {matchedRoutesAssets
        .concat(mainAssets)
        .filter((file) => file.endsWith('.css'))
        .map((file) => (
          <link key={file} rel="stylesheet" type="text/css" href={file} />
        ))}
    </>
  )
}
