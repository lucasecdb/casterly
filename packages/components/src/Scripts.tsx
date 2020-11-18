import React from 'react'

import { useRootContext } from './RootContext'

export const Scripts: React.FC = () => {
  const {
    matchedRoutesAssets,
    matchedRoutes,
    mainAssets,
    version,
  } = useRootContext()

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.__serverContext = JSON.parse(' +
            JSON.stringify(
              JSON.stringify({
                version,
                matchedRoutesAssets,
                matchedRoutes,
                mainAssets,
              })
            ) +
            ')',
        }}
      />
      {matchedRoutesAssets
        .concat(mainAssets)
        .filter((file) => file.endsWith('.js'))
        .map((scriptSource) => (
          <script key={scriptSource} defer src={scriptSource} />
        ))}
    </>
  )
}
