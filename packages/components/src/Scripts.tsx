import React from 'react'
import serializeJavascript from 'serialize-javascript'

import { useRootContext } from './RootContext'

export const Scripts: React.FC = () => {
  const { matchedRoutesAssets, matchedRoutes, mainAssets } = useRootContext()

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.__serverContext = ' +
            serializeJavascript({
              matchedRoutesAssets,
              matchedRoutes,
              mainAssets,
            }),
        }}
      />
      {matchedRoutesAssets
        .filter((file) => file.endsWith('.js'))
        .concat(mainAssets)
        .map((scriptSource) => (
          <script key={scriptSource} defer src={scriptSource} />
        ))}
    </>
  )
}
