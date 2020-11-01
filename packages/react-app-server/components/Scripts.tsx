import React from 'react'
import serializeJavascript from 'serialize-javascript'

import { useRootContext } from './RootContext'

const Scripts: React.FC = () => {
  const { matchedRoutesAssets, mainAssets } = useRootContext()

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.__serverContext = ' + serializeJavascript(useRootContext()),
        }}
      />
      {mainAssets.concat(matchedRoutesAssets).map((scriptSource) => (
        <script key={scriptSource} defer src={scriptSource} />
      ))}
    </>
  )
}

export default Scripts
