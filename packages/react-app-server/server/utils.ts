export function interopDefault(mod: any) {
  return mod.default || mod
}

export function requestHeadersToNodeHeaders(headers: Headers) {
  const nodeHeaders: Record<string, string> = {}

  headers.forEach((value, key) => {
    nodeHeaders[key] = value
  })

  return nodeHeaders
}

export function requestContainsPrecondition(req: Request) {
  const { headers } = req

  return (
    !!headers.get('if-match') ||
    !!headers.get('if-none-match') ||
    !!headers.get('if-modified-since') ||
    !!headers.get('if-unmodified-since')
  )
}

export function isPreconditionFailure(req: Request, headers: Headers) {
  const { headers: requestHeaders } = req

  const match = requestHeaders.get('if-match')

  if (match) {
    const etag = headers.get('etag')
    return (
      !etag ||
      (match !== '*' &&
        parseTokenList(match).every(
          (match) =>
            match !== etag && match !== 'W/' + etag && 'W/' + match !== etag
        ))
    )
  }

  return false
}

function parseTokenList(str: string) {
  let end = 0
  const list = []
  let start = 0

  // gather tokens
  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1
        }
        break
      case 0x2c /* , */:
        list.push(str.substring(start, end))
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  // final token
  list.push(str.substring(start, end))

  return list
}
