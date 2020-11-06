import React from 'react'
import serializeJavascript from 'serialize-javascript'

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
            'window.__serverContext = ' +
            serializeJavascript({
              version,
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
