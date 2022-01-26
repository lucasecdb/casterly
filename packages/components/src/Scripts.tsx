/// <reference types="vite/client" />

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
      {import.meta.env.DEV && (
        <script
          nonce={nonce}
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import RefreshRuntime from '/@react-refresh'
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true`,
          }}
        />
      )}
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: `
${matchedRoutes
  .map((match, index) => {
    return `import * as route${index} from '${match.route.module}'`
  })
  .join('\n')}

window.__routeModules = {
${matchedRoutes
  .map((match, index) => {
    return `"${match.route.routeId}": route${index}`
  })
  .join(',')}
}
`,
        }}
      />
      {matchedRoutesAssets
        .concat(mainAssets)
        .filter((file) => /\.[jt]sx?$/.test(file))
        .map((scriptSource) => (
          <script
            key={scriptSource}
            {...props}
            type="module"
            async
            src={scriptSource}
          />
        ))}
    </>
  )
}
