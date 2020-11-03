import React from 'react'

import { useRootContext } from './RootContext'

export const Styles: React.FC = () => {
  const { matchedRoutesAssets } = useRootContext()

  return (
    <>
      {matchedRoutesAssets
        .filter((file) => file.endsWith('.css'))
        .map((file) => (
          <link key={file} rel="stylesheet" type="text/css" href={file} />
        ))}
    </>
  )
}
