/* eslint-disable jsx-a11y/html-has-lang */

import React from 'react'
import serialize from 'serialize-javascript'

import { HelmetData } from '../lib/helmet'

interface Props {
  markup?: string
  head?: HelmetData
  scripts?: string[]
  styles?: string[]
  state?: object
}

const Document: React.FC<Props> = ({
  head,
  state,
  styles,
  scripts,
  markup = '',
}) => {
  const htmlAttributes = (head && head.htmlAttributes.toComponent()) || {}
  const bodyAttributes = (head && head.bodyAttributes.toComponent()) || {}

  return (
    <html {...htmlAttributes} inputMode={undefined}>
      <head>
        {styles.map(src => (
          <link key={src} rel="prefetch" href={src} as="style" />
        ))}
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {head.meta && head.meta.toComponent()}
        {head.title && head.title.toComponent()}
        {head.link && head.link.toComponent()}
        {head.base && head.base.toComponent()}
        {head.script && head.script.toComponent()}

        {styles.map(src => (
          <link key={src} rel="stylesheet" href={src} />
        ))}
        {scripts.map(src => (
          <script key={src} src={src} defer />
        ))}
      </head>
      <body {...bodyAttributes} inputMode={undefined}>
        {head && head.noscript && head.noscript.toComponent()}
        <div id="root" dangerouslySetInnerHTML={{ __html: markup }} />
        <script
          nonce=""
          dangerouslySetInnerHTML={{
            __html: `__STATE__ = ${serialize(state || {}, { isJSON: true })}`,
          }}
        />
      </body>
    </html>
  )
}

export default Document
