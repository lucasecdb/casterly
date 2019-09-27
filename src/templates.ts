import { HelmetData } from 'react-helmet'
import serialize from 'serialize-javascript'

const srcToScriptTag = (src: string) => `<script src="${src}" defer></script>`
const srcToLinkTag = (src: string) => `<link rel="stylesheet" href="${src}" />`

const srcToPreloadStyle = (src: string) =>
  `<link rel="prefetch" href=${src} as="style" />`

const getHeadTags = (head: HelmetData) => {
  if (!head) {
    return ''
  }

  return [
    head.meta && head.meta.toString(),
    head.title && head.title.toString(),
    head.link && head.link.toString(),
    head.base && head.base.toString(),
    head.script && head.script.toString(),
  ]
    .filter(Boolean)
    .join('\n')
}

const getNoScriptTags = (head: HelmetData) => {
  if (!head || !head.noscript) {
    return ''
  }

  return head.noscript.toString()
}

interface TemplateInput {
  markup?: string
  head?: HelmetData
  scripts?: string[]
  styles?: string[]
  state?: object
}

export const ok = (args?: TemplateInput) => {
  const { markup = '', head, scripts = [], styles = [], state } = args

  const htmlAttributes = (head && head.htmlAttributes.toString()) || ''
  const bodyAttributes = (head && head.bodyAttributes.toString()) || ''

  return `<!DOCTYPE html>
<html ${htmlAttributes}>
<head>
  ${styles.map(srcToPreloadStyle).join('\n')}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  ${getHeadTags(head)}
  ${styles.map(srcToLinkTag).join('\n')}
  ${scripts.map(srcToScriptTag).join('\n')}
</head>
<body ${bodyAttributes}>
  ${getNoScriptTags(head)}
  <div id="root">${markup}</div>
  <script nonce>
    __APOLLO_STATE__ = ${serialize(state || {}, { isJSON: true })}
  </script>
</body>
</html>`
}

export const errorPage = (err: Error) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width" />
  <title>Rendering Error</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/tachyons@4/css/tachyons.min.css" />
  <style>
    .log {
      max-width: 80%;
    }
  </style>
</head>
<body class="flex flex-column items-center helvetica">
  <div class="bg-light-red ph4 white w-100 overflow-x-auto">
    <h1>${err.message}</h1>
    <pre>${err.stack}</pre>
  </div>
</body>
</html>`
