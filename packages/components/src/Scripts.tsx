import React from 'react'

import type { RootContext } from './RootContext'
import { useRootContext } from './RootContext'

export const getScriptsFromContext = (context: RootContext): string[] => {
  const { matchedRoutesAssets, mainAssets } = context

  return matchedRoutesAssets
    .concat(mainAssets)
    .filter((file) => file.endsWith('.js'))
    .map((file) => process.env.ASSET_PATH + file.slice(1))
}

export const Scripts: React.FC<
  Omit<
    React.DetailedHTMLProps<
      React.ScriptHTMLAttributes<HTMLScriptElement>,
      HTMLScriptElement
    >,
    'src' | 'type' | 'defer' | 'async'
  >
> = ({
  nonce,
  // @ts-ignore: You could still pass them if you're
  // using pure JavaScript
  src,
  // @ts-ignore
  type,
  // @ts-ignore
  defer,
  // @ts-ignore
  async,
  ...props
}) => {
  const {
    matchedRoutesAssets,
    matchedRoutes,
    mainAssets,
    version,
    devServerPort,
  } = useRootContext()

  return (
    <>
      <script
        // We only need to add `nonce` to script tags with
        // inlined content, hence we don't add it to the scripts
        // below
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html:
            'window.__serverContext = JSON.parse(' +
            JSON.stringify(
              JSON.stringify({
                version,
                matchedRoutesAssets,
                matchedRoutes,
                mainAssets,
                devServerPort,
              })
            ) +
            ')',
        }}
      />
      {matchedRoutesAssets
        .concat(mainAssets)
        .filter((file) => file.endsWith('.js'))
        .map((scriptSource) => (
          <script
            key={scriptSource}
            {...props}
            async
            src={`/_casterly${scriptSource}`}
          />
        ))}
    </>
  )
}
